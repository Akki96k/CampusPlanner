import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireUserRole } from "@/backend/lib/auth/require-role";
import { OrganizerManagement } from "@/app/faculty/organizers/organizer-management";
import { OrganizerNotificationBanner } from "@/app/faculty/organizers/organizer-notification-banner";
import type { OrganizerApplication } from "@/backend/lib/supabase/database.types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Manage Organizers" };

type ManageOrganizersPageProps = {
  searchParams: Promise<{ result?: string }>;
};

export default function ManageOrganizersPage({ searchParams }: ManageOrganizersPageProps) {
  return (
    <Suspense fallback={<ManageOrganizersLoading />}>
      <ManageOrganizersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ManageOrganizersContent({ searchParams }: ManageOrganizersPageProps) {
  await connection();
  const [{ result }, { supabase }] = await Promise.all([searchParams, requireUserRole("faculty_admin")]);
  const applications: OrganizerApplication[] = [];
  let page = 0;
  let error: { code?: string } | null = null;
  while (true) {
    const { data, error: pageError } = await supabase.rpc("list_organizer_applications", {}).range(page * 1000, page * 1000 + 999);
    if (pageError) { error = pageError; break; }
    applications.push(...((data ?? []) as OrganizerApplication[]));
    if ((data?.length ?? 0) < 1000) break;
    page += 1;
  }
  if (error?.code === "42501") redirect("/dashboard");

  const resultMessage = result === "updated"
    ? "Organizer status updated and email sent."
    : result === "updated-email-pending"
      ? "Organizer status updated. Email delivery is pending provider configuration or a retry; the decision is saved."
      : result === "stale"
        ? "This application changed before your action completed. Refresh the list."
        : result === "reason-required"
          ? "Enter a reason before rejecting or removing an organizer."
          : result === "profile-updated"
            ? "Organizer profile updated successfully."
            : result === "profile-invalid"
              ? "Display name must be between 1 and 100 characters."
              : result === "profile-not-found"
                ? "Organizer profile was not found."
                : result === "migration-missing"
                  ? "Database migration 202611010007_faculty_edit_organizer_profile.sql must be applied in your Supabase project before organizer profiles can be edited."
                  : result === "invalid"
                    ? "The organizer action was invalid. Refresh and try again."
                  : result === "error"
                    ? "We couldn’t update this organizer. Please refresh and try again."
                    : result === "unauthorized"
                      ? "Your faculty account is not authorized to manage organizers.": null;

  const isSuccess = result === "updated" || result === "profile-updated";

  return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
    <div className="border-b border-slate-200 pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Faculty/Admin Portal</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">Manage organizers</h1>
      <p className="mt-1 text-sm text-zinc-600">Review applications and manage organizer access.</p>
    </div>
    <section className="pt-6 sm:pt-8">
      {resultMessage && <OrganizerNotificationBanner key={result ?? "notification"} result={result} message={resultMessage} isSuccess={isSuccess} />}
      {error ? <p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">Organizer applications could not be loaded. Confirm migration 202610310006_organizer_approval_and_email_outbox.sql has been applied.</p> : <OrganizerManagement applications={applications} />}
    </section>
  </main>;
}

function ManageOrganizersLoading() {
  return <main className="mx-auto w-full max-w-6xl px-6 py-12" aria-busy="true"><p className="text-sm text-zinc-600">Loading organizer applications…</p></main>;
}
