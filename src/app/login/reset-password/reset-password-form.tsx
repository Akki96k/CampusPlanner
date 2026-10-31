"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePasswordAction } from "@/backend/actions/auth";
import { initialAuthActionState, type AuthActionState } from "@/backend/lib/auth/action-state";

export default function ResetPasswordPage({ linkError = false }: { linkError?: boolean }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(updatePasswordAction, initialAuthActionState);
  return <main className="mx-auto flex min-h-screen max-w-md items-center px-6"><section className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold text-zinc-950">Choose a new password</h1><p className="mt-2 text-sm text-zinc-600">Use the secure link sent to your email.</p>{linkError && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">This reset link has expired or was already used. Request a fresh link and open the newest email.</p>}<form action={action} className="mt-6 space-y-4"><label className="block text-sm font-medium">New password<input name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5" /></label><label className="block text-sm font-medium">Confirm password<input name="confirmPassword" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5" /></label>{state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm text-zinc-700">{state.message}</p>}<button disabled={pending} className="w-full rounded-lg bg-indigo-700 px-4 py-3 text-sm font-semibold text-white">{pending ? "Updating…" : "Update password"}</button></form><Link href="/login" className="mt-5 inline-block text-sm font-semibold text-indigo-700">Back to sign in</Link></section></main>;
}
