import { Suspense } from "react";
import { AuthForm } from "@/app/login/auth-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Login" };

type LoginPageProps = {
  searchParams: Promise<{ error?: string; role?: string }>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-md px-6 py-12 text-sm text-zinc-600">Loading sign-in…</p>}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const { error, role } = await searchParams;
  const selectedRole = role === "student" || role === "organizer" || role === "faculty_admin" ? role : undefined;
  return (
    <div className="login-experience">
      <div className="login-form-side">
        <AuthForm mode="signin" selectedRole={selectedRole} confirmationError={error === "confirmation"} helpUrl={process.env.NEXT_PUBLIC_HELP_URL} />
      </div>
      <aside className="login-video-panel" aria-label="CampusPlanner introduction">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="login-background-video"
        >
          <source src="/assets/campus-background.mp4" type="video/mp4" />
        </video>
        <div className="login-video-shade" />
      </aside>
    </div>
  );
}
