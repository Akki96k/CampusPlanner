import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";

/**
 * Verifies email links that carry a one-time token hash. Unlike a PKCE code,
 * the token hash does not depend on a verifier cookie from the browser that
 * requested the email, so recovery links also work when opened on a phone.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const requestedPath = requestUrl.searchParams.get("next");
  const nextPath = isSafeInternalPath(requestedPath) ? requestedPath : "/dashboard";

  if (!tokenHash || (type !== "recovery" && type !== "signup" && type !== "email")) {
    return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    const failurePath = type === "recovery" ? "/login/reset-password?error=invalid_link" : "/login?error=confirmation";
    return NextResponse.redirect(new URL(failurePath, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}

function isSafeInternalPath(path: string | null): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\"));
}
