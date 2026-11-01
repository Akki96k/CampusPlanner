import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordForm from "@/app/login/reset-password/reset-password-form";

export const metadata: Metadata = { title: "Reset Password" };

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-md px-6 py-12 text-sm text-zinc-600">Loading reset password…</p>}>
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordContent({ searchParams }: ResetPasswordPageProps) {
  const { error } = await searchParams;
  return <ResetPasswordForm linkError={error === "invalid_link"} />;
}
