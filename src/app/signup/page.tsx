import { AuthForm } from "@/app/login/auth-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create Account" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
