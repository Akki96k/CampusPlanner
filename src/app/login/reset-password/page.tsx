import type { Metadata } from "next";
import ResetPasswordForm from "@/app/login/reset-password/reset-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <ResetPasswordForm linkError={error === "invalid_link"} />;
}
