"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resetPasswordAction, signInAction, signUpAction } from "@/backend/actions/auth";
import {
  initialAuthActionState,
  type AuthActionState,
} from "@/backend/lib/auth/action-state";

type AuthFormProps = {
  mode: "signin" | "signup";
  selectedRole?: "student" | "organizer" | "faculty_admin";
  confirmationError?: boolean;
  helpUrl?: string;
};

export function AuthForm({ mode, selectedRole, confirmationError = false, helpUrl }: AuthFormProps) {
  const isSignup = mode === "signup";
  const action = isSignup ? signUpAction : signInAction;
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    action,
    initialAuthActionState,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [signupRole, setSignupRole] = useState<"student" | "organizer">("student");

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center px-6 py-12">
      <section className={`w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm ${!isSignup ? "auth-login-card" : ""}`}>
        <p className={`text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700 ${!isSignup ? "auth-brand" : ""}`}>
          CampusPlanner
        </p>
        <h1 className={`mt-3 text-3xl font-semibold tracking-tight text-zinc-950 ${!isSignup ? "auth-heading" : ""}`}>
          {isSignup ? "Create your account" : "Welcome Back!"}
        </h1>
        <p className={`mt-2 text-sm leading-6 text-zinc-600 ${!isSignup ? "auth-description" : ""}`}>
          {isSignup
            ? "Use your college email to join your campus community."
            : "Sign in to continue your CampusPlanner journey."}
        </p>
        {!isSignup && selectedRole && <p className="auth-role-title mt-4 rounded-xl bg-indigo-50 px-4 py-3">{selectedRole === "faculty_admin" ? "Faculty Login" : `${selectedRole[0].toUpperCase()}${selectedRole.slice(1)} Login`}</p>}

        {confirmationError && (
          <p role="alert" className={`mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800 ${!isSignup ? "auth-message" : ""}`}>
            That confirmation link is invalid or expired. Sign in or request a new account confirmation.
          </p>
        )}

        <form action={formAction} className={`mt-8 space-y-5 ${!isSignup ? "auth-form" : ""}`}>
          {isSignup && <>
            <div>
              <label htmlFor="account-role" className="mb-2 block text-sm font-medium text-zinc-800">Account type</label>
              <select id="account-role" name="accountRole" value={signupRole} onChange={(event) => setSignupRole(event.target.value === "organizer" ? "organizer" : "student")} className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-950">
                <option value="student">Student</option>
                <option value="organizer">Organizer (requires faculty approval)</option>
              </select>
            </div>
            <div>
              <label htmlFor="display-name" className="mb-2 block text-sm font-medium text-zinc-800">Full name{signupRole === "organizer" ? "" : " (optional)"}</label>
              <input id="display-name" name="displayName" type="text" maxLength={100} required={signupRole === "organizer"} autoComplete="name" className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-950" />
            </div>
          </>}
          <div className={!isSignup ? "auth-field auth-field-email" : ""}>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-800">
              Email address
            </label>
            <div className={!isSignup ? "auth-input-wrap" : ""}>
            {!isSignup && <AuthFieldIcon kind="email" />}
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              className={`w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-950 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 ${!isSignup ? "auth-input" : ""}`}
            />
            </div>
          </div>

          <div className={!isSignup ? "auth-field auth-field-password" : ""}>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-800">
              Password
            </label>
            <div className={!isSignup ? "auth-input-wrap auth-password-wrap" : ""}>
            {!isSignup && <AuthFieldIcon kind="password" />}
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={8}
              maxLength={128}
              className={`w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-950 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 ${!isSignup ? "auth-input auth-password-input" : ""}`}
            />
            {!isSignup && <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="auth-password-toggle"><AuthFieldIcon kind={showPassword ? "eyeOff" : "eye"} /></button>}
            </div>
            {isSignup && <button type="button" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword} className="mt-2 text-xs font-semibold text-indigo-700 underline">{showPassword ? "Hide password" : "Show password"}</button>}
          </div>

          {!isSignup && <label className="auth-remember flex items-center gap-2 text-sm text-zinc-700"><input type="checkbox" name="rememberMe" className="size-4 accent-indigo-700" />Remember me on this device</label>}

          {isSignup && (
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-zinc-800">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-950 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          )}

          {state.message && (
            <p
              role={state.status === "error" ? "alert" : "status"}
              aria-live="polite"
              className={`rounded-lg px-3 py-2.5 text-sm ${!isSignup ? "auth-message" : ""} ${
                state.status === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className={`w-full rounded-lg bg-indigo-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${!isSignup ? "auth-submit" : ""}`}
          >
            {isPending && !isSignup && <span className="auth-spinner" aria-hidden="true" />}
            {isPending ? "Please wait…" : isSignup ? "Create account" : "Sign In"}
          </button>
        </form>

        {!isSignup && <form className="mt-5 border-t border-zinc-100 pt-4">
          <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-zinc-800">Forgot password?</label>
          <input id="reset-email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="Your account email" className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-950" />
          <ResetPasswordSubmit />
        </form>}

        <p className="mt-6 text-center text-sm text-zinc-600">
            {isSignup ? "Already have an account?" : "New to CampusPlanner?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-indigo-700 underline-offset-4 hover:underline"
          >
            {isSignup ? "Sign in" : "Create Account"}
          </Link>
        </p>
        {!isSignup && <p className="mt-4 text-center text-xs text-zinc-500">Need help? {helpUrl ? <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-700 underline">Contact your campus administrator<span className="sr-only"> (opens in a new tab)</span></a> : "Contact your campus administrator."}</p>}
        <Link href="/" className="mt-4 block text-center text-sm font-semibold text-indigo-700">← Back to events</Link>
      </section>
    </main>
  );
}

function AuthFieldIcon({ kind }: { kind: "email" | "password" | "eye" | "eyeOff" }) {
  const common = { "aria-hidden": true as const, viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (kind === "email") return <svg {...common} className="auth-input-icon"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>;
  if (kind === "password") return <svg {...common} className="auth-input-icon"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/></svg>;
  if (kind === "eyeOff") return <svg {...common} className="size-5"><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.5 4.6 9.5 6.3a1.3 1.3 0 0 1 0 1.4 16 16 0 0 1-3.1 3.7M6.2 6.2a16 16 0 0 0-3.7 4.9 1.3 1.3 0 0 0 0 1.4A10.8 10.8 0 0 0 12 17c.7 0 1.4-.1 2-.2"/></svg>;
  return <svg {...common} className="size-5"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>;
}

function ResetPasswordSubmit() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(resetPasswordAction, initialAuthActionState);
  return <div><button formAction={action} disabled={pending} className="mt-3 text-sm font-semibold text-indigo-700 underline">{pending ? "Sending…" : "Send reset link"}</button>{state.message && <p role={state.status === "error" ? "alert" : "status"} className={`mt-2 text-sm ${state.status === "error" ? "text-rose-700" : "text-emerald-800"}`}>{state.message}</p>}</div>;
}
