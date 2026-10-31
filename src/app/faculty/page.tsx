import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { signOutAction } from "@/backend/actions/dashboard";
import { approveEventAction, rejectEventAction } from "@/backend/actions/faculty";
import { requireUserRole } from "@/backend/lib/auth/require-role";
import type { CampusEvent } from "@/backend/lib/supabase/database.types";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { NotificationCenter } from "@/components/notification-center";
import { loadNotificationSnapshot } from "@/backend/lib/notifications/load";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Faculty Dashboard" };

type FacultyPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default function FacultyPage({ searchParams }: FacultyPageProps) {
  return (
    <Suspense fallback={<PageLoading />}>
      <FacultyContent searchParams={searchParams} />
    </Suspense>
  );
}

async function FacultyContent({ searchParams }: FacultyPageProps) {
  await connection();
  const [{ status }, { supabase, userId }] = await Promise.all([
    searchParams,
    requireUserRole("faculty_admin"),
  ]);
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true })
    .limit(100);
  const notificationSnapshot = await loadNotificationSnapshot(supabase);

  const statusMessage = status === "approved"
    ? "Event approved and published."
    : status === "rejected"
      ? "Event rejected. Your remark is now visible to the event organizer."
      : status === "not-pending"
        ? "That event has already been reviewed or is no longer pending."
        : status === "remark-required"
          ? "Add a rejection remark of up to 2,000 characters before rejecting this event."
        : status === "invalid"
          ? "The event reference was invalid. Refresh and try again."
          : status === "error"
            ? "We couldn’t update that event. Please try again."
            : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight text-indigo-800">CampusPlanner</Link>
        <div className="flex items-center gap-4">
          <nav aria-label="Faculty navigation" className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="font-medium text-indigo-700 hover:text-indigo-900">Browse events</Link>
            <Link href="/faculty" aria-current="page" className="font-medium text-zinc-600">Approval queue</Link>
            <Link href="/faculty/organizers" className="font-medium text-zinc-600 hover:text-indigo-700">Manage organizers</Link>
          </nav>
          <form action={signOutAction}>
            <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Sign out</button>
          </form>
        </div>
      </header>

      <section className="py-10 sm:py-14">
        <div className="mb-6 flex justify-end"><NotificationCenter userId={userId} role="faculty_admin" initialNotifications={notificationSnapshot.notifications} initialUnreadCount={notificationSnapshot.unreadCount} /></div>
        {notificationSnapshot.error && <p role="status" className="mb-4 text-sm text-amber-800">Notifications are temporarily unavailable. Check that the notifications migration has been applied.</p>}
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">Faculty/Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Event approval queue</h1>
        <p className="mt-2 text-zinc-600">Review event details, then approve or reject the pending submission.</p>

        {statusMessage && <p className={`mt-5 rounded-lg p-4 text-sm ${status === "approved" || status === "rejected" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`} role={status === "approved" || status === "rejected" ? "status" : "alert"}>{statusMessage}</p>}
        {error ? (
          <p className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">We couldn’t load the approval queue. Confirm that both SQL migrations are applied, then refresh.</p>
        ) : events.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
            <h2 className="text-lg font-semibold text-zinc-900">The queue is clear</h2>
            <p className="mt-2 text-sm text-zinc-600">New organizer submissions will appear here for review.</p>
          </section>
        ) : (
          <ul className="mt-8 grid gap-5">
            {events.map((event) => <ApprovalCard event={event} key={event.id} />)}
          </ul>
        )}
      </section>
    </main>
  );
}

function ApprovalCard({ event }: { event: CampusEvent }) {
  const startsAt = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short" }).format(new Date(event.starts_at));
  const endsAt = new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(new Date(event.ends_at));

  return (
    <li id={`event-${event.id}`} className="list-none scroll-mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">{event.category}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">{event.title}</h2>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Pending review</span>
      </div>
      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-zinc-700">{event.description}</p>
      <dl className="mt-5 grid gap-3 border-t border-zinc-100 pt-4 text-sm sm:grid-cols-3">
        <div><dt className="font-medium text-zinc-500">When</dt><dd className="mt-1 text-zinc-900">{startsAt}–{endsAt}</dd></div>
        <div><dt className="font-medium text-zinc-500">Where</dt><dd className="mt-1 text-zinc-900">{event.venue}</dd></div>
        <div><dt className="font-medium text-zinc-500">Capacity</dt><dd className="mt-1 text-zinc-900">{event.capacity === null ? "Not specified" : `${event.capacity} attendees`}</dd></div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <form action={approveEventAction}>
          <input type="hidden" name="eventId" value={event.id} />
          <ActionSubmitButton pendingLabel="Approving…" tone="success">Approve event</ActionSubmitButton>
        </form>
        <form action={rejectEventAction} className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(16rem,1fr)_auto] sm:items-end">
          <input type="hidden" name="eventId" value={event.id} />
          <div>
            <label htmlFor={`remark-${event.id}`} className="mb-1.5 block text-sm font-semibold text-zinc-800">Disapproval comment / remarks <span className="text-rose-700" aria-hidden="true">*</span></label>
            <textarea id={`remark-${event.id}`} name="remark" required maxLength={2000} rows={3} placeholder="Explain what the organizer should revise before resubmitting." className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-500 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
            <p className="mt-1 text-xs text-zinc-500">Required · up to 2,000 characters</p>
          </div>
          <ActionSubmitButton pendingLabel="Rejecting…" tone="danger">Reject event</ActionSubmitButton>
        </form>
      </div>
    </li>
  );
}

function PageLoading() {
  return <main className="mx-auto w-full max-w-6xl px-6 py-12" aria-busy="true"><p className="text-sm text-zinc-600">Loading approval queue…</p></main>;
}
