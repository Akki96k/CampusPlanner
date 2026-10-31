"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { passwordsMatch, validateAuthCredentials } from "@/backend/lib/auth/validation";
import type { AuthActionState } from "@/backend/lib/auth/action-state";
import { hasSupabaseConfig } from "@/backend/lib/supabase/config";
import { createClient } from "@/backend/lib/supabase/server";

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!hasSupabaseConfig()) {
    return {
      status: "error",
      message: "Add your Supabase project URL and publishable key to .env.local first.",
    };
  }

  const validation = validateAuthCredentials(
    formData.get("email"),
    formData.get("password"),
  );
  if (!validation.success) {
    return { status: "error", message: validation.message };
  }

  try {
    const rememberValue = formData.get("rememberMe");
    const supabase = await createClient({ rememberMe: rememberValue === "on" });
    const { error } = await supabase.auth.signInWithPassword(validation.credentials);
    if (error) {
      return {
        status: "error",
        message: "Those sign-in details didn’t work. Check them and try again.",
      };
    }
    const cookieStore = await cookies();
    cookieStore.set("cc-remember", rememberValue === "on" ? "true" : "false", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(rememberValue === "on" ? { maxAge: 60 * 60 * 24 * 365 } : {}),
    });
  } catch {
    return {
      status: "error",
      message: "We couldn’t reach the sign-in service. Please try again later.",
    };
  }

  redirect("/dashboard");
}

export async function resetPasswordAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const rawEmail = formData.get("email");
  if (typeof rawEmail !== "string" || rawEmail.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim())) return { status: "error", message: "Enter a valid email address." };
  let siteUrl: URL;
  try { siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"); }
  catch { return { status: "error", message: "Password reset is not configured. Contact your administrator." }; }
  const local = siteUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(siteUrl.hostname);
  if (siteUrl.protocol !== "https:" && !local) return { status: "error", message: "Password reset requires a secure site URL." };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(rawEmail.trim().toLowerCase(), { redirectTo: new URL("/auth/callback?next=/login/reset-password", siteUrl).toString() });
    if (error) {
      // Supabase rate limits recovery emails. Tell users when a resend is too soon;
      // keep other provider details out of the response.
      if (error.status === 429 || error.code === "over_email_send_rate_limit") {
        return { status: "error", message: "A reset email was sent recently. Wait a few minutes, then check your inbox and spam folder before requesting another." };
      }
      return { status: "error", message: "We couldn’t send a reset email. Check your connection and try again. If this continues, contact your administrator." };
    }
    return { status: "success", message: "If an account uses that address, password reset instructions are on the way." };
  } catch { return { status: "error", message: "We couldn’t reach the sign-in service. Please try again later." }; }
}

export async function updatePasswordAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 8 || password.length > 128) return { status: "error", message: "Choose a password between 8 and 128 characters." };
  if (password !== formData.get("confirmPassword")) return { status: "error", message: "The passwords do not match." };
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims?.sub) return { status: "error", message: "This reset link is invalid or expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: "We couldn’t update your password. Request a new reset link and try again." };
  return { status: "success", message: "Password updated. You can now sign in with your new password." };
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!hasSupabaseConfig()) {
    return {
      status: "error",
      message: "Add your Supabase project URL and publishable key to .env.local first.",
    };
  }

  const validation = validateAuthCredentials(
    formData.get("email"),
    formData.get("password"),
  );
  if (!validation.success) {
    return { status: "error", message: validation.message };
  }

  const requestedRole = formData.get("accountRole");
  if (requestedRole !== "student" && requestedRole !== "organizer") {
    return { status: "error", message: "Choose Student or Organizer." };
  }
  const rawDisplayName = formData.get("displayName");
  const displayName = typeof rawDisplayName === "string"
    ? rawDisplayName.trim().replace(/\s+/g, " ")
    : "";
  if (requestedRole === "organizer" && !displayName) {
    return { status: "error", message: "Enter your name to submit an organizer application." };
  }
  if (displayName.length > 100 || /[\u0000-\u001f\u007f]/.test(displayName)) {
    return { status: "error", message: "Enter a name of up to 100 characters." };
  }

  if (!passwordsMatch(validation.credentials.password, formData.get("confirmPassword"))) {
    return { status: "error", message: "The passwords do not match." };
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  } catch {
    return {
      status: "error",
      message: "NEXT_PUBLIC_SITE_URL must be a valid URL in .env.local.",
    };
  }

  const isLocalHttp =
    siteUrl.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(siteUrl.hostname);
  if (siteUrl.protocol !== "https:" && !isLocalHttp) {
    return {
      status: "error",
      message: "NEXT_PUBLIC_SITE_URL must use HTTPS (or localhost for development).",
    };
  }

  let hasSession = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      ...validation.credentials,
      options: {
        data: { account_role: requestedRole, display_name: displayName || null },
        emailRedirectTo: new URL("/auth/callback?next=/dashboard", siteUrl).toString(),
      },
    });

    if (error) {
      return {
        status: "error",
        message: "We couldn’t create that account. Check the details and try again.",
      };
    }

    hasSession = Boolean(data.session);
  } catch {
    return {
      status: "error",
      message: "We couldn’t reach the sign-up service. Please try again later.",
    };
  }

  if (hasSession) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message: requestedRole === "organizer"
      ? "Your organizer application is pending faculty approval. Check your email to confirm your address; organizer tools will be available after approval."
      : "If this address is eligible for registration, check your email to confirm it.",
  };
}
