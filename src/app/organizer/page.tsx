import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { signOutAction } from "@/backend/actions/dashboard";
import { submitEventForApprovalAction } from "@/backend/actions/organizer";
import { EventForm } from "@/app/organizer/event-form";
import { requireUserRole } from "@/backend/lib/auth/require-role";
import type { CampusEvent } from "@/backend/lib/supabase/database.types";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { NotificationCenter } from "@/components/notification-center";
import { loadNotificationSnapshot } from "@/backend/lib/notifications/load";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organizer Dashboard" };

type OrganizerPageProps = {
  searchParams: Promise<{ status?: string; edit?: string | string[] }>;
};

export default function OrganizerPage({ searchParams }: OrganizerPageProps) {
  return (
    <Suspense fallback={<PageLoading />}>
      <OrganizerContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OrganizerContent({ searchParams }: OrganizerPageProps) {
  await connection();
  const [{ status, edit }, { supabase, userId }] = await Promise.all([
    searchParams,
    requireUserRole("organizer"),
  ]);
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("organizer_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const eventIds = (events ?? []).map((event) => event.id);
  const notificationSnapshot = await loadNotificationSnapshot(supabase);
  const remarksResult = eventIds.length > 0
    ? await supabase.from("event_review_remarks").select("event_id, remark, created_at").in("event_id", eventIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  const latestRemarkByEvent = new Map<string, { remark: string; created_at: string }>();
  for (const item of remarksResult.data ?? []) {
    if (!latestRemarkByEvent.has(item.event_id)) latestRemarkByEvent.set(item.event_id, { remark: item.remark, created_at: item.created_at });
  }
  const editableEvent = typeof edit === "string"
    ? events?.find((event) => event.id === edit && (event.status === "draft" || event.status === "rejected"))
    : undefined;
  const migrationMissing = error?.code === "42P01" || error?.code === "PGRST205";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight text-indigo-800">CampusPlanner</Link>
        <div className="flex items-center gap-4">
          <nav aria-label="Organizer navigation" className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="font-medium text-indigo-700 hover:text-indigo-900">Browse events</Link>
            <Link href="/organizer" aria-current="page" className="font-medium text-zinc-600">Organizer tools</Link>
          </nav>
          <form action={signOutAction}>
            <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Sign out</button>
          </form>
        </div>
      </header>

      <div className="py-10 sm:py-14">
        <div className="mb-6 flex justify-end"><NotificationCenter userId={userId} role="organizer" initialNotifications={notificationSnapshot.notifications} initialUnreadCount={notificationSnapshot.unreadCount} /></div>
        {notificationSnapshot.error && <p role="status" className="mb-4 text-sm text-amber-800">Notifications are temporarily unavailable. Check that the notifications migration has been applied.</p>}
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">Organizer workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">{editableEvent ? "Edit your event" : "Create a campus event"}</h1>
        <p className="mt-2 max-w-2xl text-zinc-600">{editableEvent ? "Update the event details and save them as a draft. You can then resubmit it for faculty approval." : "Save a draft first. When its details are ready, submit it for faculty approval before it appears in student discovery."}</p>

        {status === "submitted" && <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900" role="status">Your event was sent to the faculty approval queue.</p>}
        {status === "not-submittable" && <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" role="alert">That event is no longer a draft or rejected event, so it can’t be submitted again.</p>}
        {status === "invalid" && <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" role="alert">The event reference was invalid. Refresh and try again.</p>}
        {status === "error" && <p className="mt-5 rounded-lg bg-rose-50 p-4 text-sm text-rose-900" role="alert">We couldn’t submit that event. Please try again.</p>}

        {edit && !editableEvent && !error && <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="alert">This event can’t be edited. Only your drafts and rejected events can be changed.</p>}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8" aria-labelledby="create-event-heading">
          <h2 id="create-event-heading" className="sr-only">{editableEvent ? "Edit event details" : "New event details"}</h2>
          <EventForm event={editableEvent} />
        </section>

        <section className="mt-12" aria-labelledby="your-events-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="your-events-heading" className="text-2xl font-semibold tracking-tight text-zinc-950">Your events</h2>
              <p className="mt-1 text-sm text-zinc-600">Drafts and submissions are visible only to you and authorized faculty.</p>
            </div>
          </div>
          {remarksResult.error && <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">Faculty remarks are unavailable. Apply the new event rejection remarks migration, then refresh.</p>}
          {error ? (
            <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
              {migrationMissing
                ? "Apply both SQL migrations in supabase/migrations/ to set up event storage and permissions."
                : "We couldn’t load your events. Please refresh the page."}
            </p>
          ) : events.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-600">You haven’t created an event yet. New events are saved as drafts.</p>
          ) : (
            <ul className="mt-5 grid gap-4 md:grid-cols-2">
              {events.map((event) => <OrganizerEventCard event={event} remark={latestRemarkByEvent.get(event.id)} key={event.id} />)}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function OrganizerEventCard({ event, remark }: { event: CampusEvent; remark?: { remark: string; created_at: string } }) {
  const startsAt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.starts_at));
  const statusLabel = event.status.replaceAll("_", " ");
  const canSubmit = event.status === "draft" || event.status === "rejected";

  return (
    <li id={`event-${event.id}`} className="list-none scroll-mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">{event.category}</p>
          <h3 className="mt-2 text-lg font-semibold text-zinc-950">{event.title}</h3>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold capitalize text-zinc-700">{statusLabel}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{event.venue} · {startsAt}</p>
      {event.status === "rejected" && <p className="mt-3 text-sm text-amber-800">This event was rejected. Review it before submitting it again.</p>}
      {remark && <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" aria-label="Faculty rejection remarks"><h4 className="text-sm font-bold text-amber-950">Faculty remarks</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900">{remark.remark}</p><p className="mt-2 text-xs text-amber-800">Received {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(remark.created_at))}</p></section>}
      {canSubmit && (
        <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link href={`/organizer?edit=${encodeURIComponent(event.id)}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Edit details</Link>
        <form action={submitEventForApprovalAction}>
          <input type="hidden" name="eventId" value={event.id} />
          <ActionSubmitButton pendingLabel="Submitting…" tone="outline">Submit for approval</ActionSubmitButton>
        </form>
        </div>
      )}
    </li>
  );
}

function PageLoading() {
  return <main className="mx-auto w-full max-w-6xl px-6 py-12" aria-busy="true"><p className="text-sm text-zinc-600">Loading organizer tools…</p></main>;
}
