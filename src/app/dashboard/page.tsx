import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { escapeLikePattern, parseEventSearch } from "@/backend/lib/events/search";
import { createClient } from "@/backend/lib/supabase/server";
import type { CampusEvent } from "@/backend/lib/supabase/database.types";
import { markAttendanceAction } from "@/backend/actions/registration";
import { StudentSidebar } from "@/app/dashboard/student-sidebar";
import { OrganizerSidebar } from "@/app/organizer/organizer-sidebar";
import { FacultySidebar } from "@/app/faculty/faculty-sidebar";
import { resolveDashboardSidebarKind } from "@/backend/lib/auth/dashboard-sidebar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

type DashboardPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }: DashboardPageProps) {
  await connection();
  const { q } = await searchParams;
  const search = parseEventSearch(q);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const email = typeof data.claims.email === "string" ? data.claims.email : "Signed-in account";
  const profileId = data.claims.sub;
  const [profileResult, eventsResult] = await Promise.all([
    supabase.from("profiles").select("display_name, role").eq("id", profileId).maybeSingle(),
    search === null
      ? Promise.resolve({ data: null, error: null })
      : (() => {
          let eventsQuery = supabase
            .from("events")
            .select("*")
            .eq("status", "approved")
            .gte("starts_at", new Date().toISOString())
            .order("starts_at", { ascending: true })
            .limit(50);

          if (search) {
            eventsQuery = eventsQuery.ilike("title", `%${escapeLikePattern(search)}%`);
          }

          return eventsQuery;
        })(),
  ]);
  const displayName = profileResult.data?.display_name || email;
  const role = profileResult.data?.role;
  const organizerApplicationResult = role === "organizer"
    ? await supabase.from("organizer_applications").select("status").eq("organizer_id", profileId).maybeSingle()
    : { data: null, error: null };
  const organizerApproved = role === "organizer" && organizerApplicationResult.data?.status === "approved";
  const ownRegistrationsResult = role === "student"
    ? await supabase.from("event_registrations").select("id, event_id, status, attendance, created_at").eq("student_id", profileId).order("created_at", { ascending: false }).limit(100)
    : { data: [], error: null };
  const ownRegistrations = ownRegistrationsResult.data ?? [];
  const registeredEventIds = [...new Set(ownRegistrations.map((row) => row.event_id))];
  const registeredEventsResult = registeredEventIds.length
    ? await supabase.from("events").select("id, title, starts_at, ends_at, venue").in("id", registeredEventIds)
    : { data: [], error: null };
  const registeredEvents = registeredEventsResult.data ?? [];
  const upcomingRegistrations = ownRegistrations.filter((registration) => {
    const event = registeredEvents.find((row) => row.id === registration.event_id);
    return event && new Date(event.starts_at).getTime() >= new Date().getTime() && registration.status === "registered";
  });
  const pastAttendedRegistrations = ownRegistrations.filter((registration) => {
    const event = registeredEvents.find((row) => row.id === registration.event_id);
    return event && new Date(event.starts_at).getTime() < new Date().getTime() && registration.attendance === "attended";
  });
  const managedEventIds = organizerApproved
    ? (await supabase.from("events").select("id").eq("organizer_id", profileId)).data?.map((event) => event.id) ?? []
    : [];
  const managedRegistrations = role === "faculty_admin" || managedEventIds.length
    ? await supabase.from("event_registrations").select("id, event_id, full_name, email, phone, college_name, student_number, year_or_semester, graduation_year, participation_type, attendance").eq("attendance", "pending").limit(200)
    : { data: [], error: null };
  const managedEvents = managedEventIds.length ? (await supabase.from("events").select("id, title").in("id", managedEventIds)).data ?? [] : [];
  const managedEventMap = new Map(managedEvents.map((event) => [event.id, event.title]));
  const dashboardLabel = profileResult.data?.role === "organizer"
    ? organizerApproved ? "Organizer dashboard" : "Organizer application"
    : profileResult.data?.role === "faculty_admin"
      ? "Faculty/Admin dashboard"
      : "Student dashboard";
  const events: CampusEvent[] = eventsResult.data ?? [];
  const migrationMissing = eventsResult.error?.code === "42P01" || eventsResult.error?.code === "PGRST205";

  const sidebarKind = resolveDashboardSidebarKind(role);
  const sidebar = sidebarKind === "faculty" ? (
    <FacultySidebar />
  ) : sidebarKind === "organizer" ? (
    <OrganizerSidebar />
  ) : (
    <StudentSidebar email={email} />
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {sidebar}
      <div className="flex-1 min-w-0">
        <main className="min-h-screen bg-[#f7f8fc] px-4 py-5 sm:px-7 sm:py-8">
          <section className="mx-auto max-w-7xl pb-8 sm:pb-12">
        {role === "organizer" && !organizerApproved && <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950" role="status"><p className="font-semibold">{organizerApplicationResult.data?.status === "rejected" ? "Organizer application rejected" : organizerApplicationResult.data?.status === "removed" ? "Organizer access restricted" : "Organizer application pending"}</p><p className="mt-1">{organizerApplicationResult.data?.status === "rejected" ? "Faculty did not approve this application. Organizer features are unavailable." : organizerApplicationResult.data?.status === "removed" ? "Faculty has removed access to organizer features." : "Your organizer account is awaiting faculty approval. You will receive access to organizer features once your application has been approved."}</p><Link href="/organizer/access" className="mt-2 inline-block font-semibold underline">View application status</Link></div>}
        {role === "student" && <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="my-events-heading">
          <h2 id="my-events-heading" className="text-2xl font-bold tracking-tight text-slate-950">My Events</h2>
          <p className="mt-1 text-sm text-slate-600">Your registrations and verified attendance.</p>
          {ownRegistrationsResult.error || registeredEventsResult.error ? <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">We couldn’t load your event history. Confirm migration 202610190003_event_registrations.sql has been applied.</p> : ownRegistrations.length === 0 ? <p className="mt-4 text-sm text-slate-600">You haven’t registered for an event yet.</p> : <div className="mt-4 space-y-6"><section><h3 className="font-semibold text-slate-900">Upcoming events</h3>{upcomingRegistrations.length ? <RegistrationCards registrations={upcomingRegistrations} events={registeredEvents} /> : <p className="mt-2 text-sm text-slate-600">No upcoming registered events.</p>}</section><section><h3 className="font-semibold text-slate-900">Past attended events</h3>{pastAttendedRegistrations.length ? <RegistrationCards registrations={pastAttendedRegistrations} events={registeredEvents} /> : <p className="mt-2 text-sm text-slate-600">No past attended events.</p>}</section></div>}
        </section>}
        {(organizerApproved || role === "faculty_admin") && <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="attendance-heading"><h2 id="attendance-heading" className="text-2xl font-bold text-slate-950">Attendance</h2><p className="mt-1 text-sm text-slate-600">Mark attendance for registrations you are authorized to manage.</p>{managedRegistrations.error ? <p role="alert" className="mt-4 text-sm text-rose-700">Registration records could not be loaded.</p> : (managedRegistrations.data ?? []).filter((row) => role === "faculty_admin" || managedEventMap.has(row.event_id)).length === 0 ? <p className="mt-4 text-sm text-slate-600">No registrations are waiting for attendance review.</p> : <ul className="mt-4 space-y-3">{(managedRegistrations.data ?? []).filter((row) => role === "faculty_admin" || managedEventMap.has(row.event_id)).map((row) => <li key={row.id} className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">{role === "faculty_admin" ? events.find((e) => e.id === row.event_id)?.title ?? "Event registration" : managedEventMap.get(row.event_id)}</h3><p className="mt-1 text-sm text-slate-600">{row.full_name} · {row.email} · {row.phone}<br />{row.college_name} · ID {row.student_number} · {row.year_or_semester} · Graduation {row.graduation_year} · {row.participation_type}</p><div className="mt-3 flex gap-2">{["attended", "absent"].map((attendance) => <form action={markAttendanceAction} key={attendance}><input type="hidden" name="registrationId" value={row.id} /><input type="hidden" name="attendance" value={attendance} /><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Mark {attendance}</button></form>)}</div></li>)}</ul>}</section>}
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-700 to-violet-700 px-6 py-8 text-white shadow-xl shadow-indigo-200 sm:px-9 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">{dashboardLabel}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Good to see you, {displayName.split("@")[0]}</h1>
            <p className="mt-2 text-indigo-100">Find approved events happening around your campus.</p>
          </div>
          <form action="/dashboard" method="get" className="flex w-full max-w-lg gap-2 rounded-xl bg-white p-1.5 sm:ml-auto">
            <label htmlFor="event-search" className="sr-only">Search event titles</label>
            <input
              id="event-search"
              name="q"
              type="search"
              defaultValue={search ?? (typeof q === "string" ? q : "")}
              maxLength={80}
              placeholder="Search event titles"
              className="min-w-0 flex-1 rounded-lg border-0 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Search
            </button>
          </form>
        </div>
        </div>

        {search === null ? (
          <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
            Search must be a single value of 80 characters or fewer. Try a shorter search.
          </p>
        ) : eventsResult.error ? (
          <section className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950" role="alert">
            <h2 className="font-semibold">{migrationMissing ? "Set up the events database" : "Events are temporarily unavailable"}</h2>
            <p className="mt-2 text-sm leading-6">
              {migrationMissing
                ? "Apply supabase/migrations/202610190001_initial_events_schema.sql in your Supabase SQL Editor, then refresh this page."
                : "We could not load events right now. Please refresh the page in a moment."}
            </p>
          </section>
        ) : events.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
            <h2 className="text-lg font-semibold text-zinc-900">{search ? "No matching events" : "No upcoming events yet"}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-600">
              {search
                ? "Try another title or clear your search to see all approved events."
                : "There are no approved events to show yet. Organizer event creation and faculty approval are the next workflows to add."}
            </p>
            {search && <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-indigo-700 hover:text-indigo-900">Clear search</Link>}
          </section>
        ) : (
          <>
            <p className="mt-8 text-sm text-zinc-600">{events.length}{events.length === 50 ? "+" : ""} upcoming event{events.length === 1 ? "" : "s"}{search ? ` matching “${search}”` : ""}</p>
            <ul className="mt-4 grid gap-5 md:grid-cols-2">
              {events.map((event) => <EventCard event={event} key={event.id} />)}
            </ul>
          </>
        )}
      </section>
    </main>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: CampusEvent }) {
  const start = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(event.starts_at));

  return (
    <li className="list-none">
      <article className="group h-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
        <div className="flex min-h-28 items-end justify-between bg-gradient-to-br from-indigo-100 to-sky-100 p-5"><p className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700">{event.category}</p><span className="text-5xl font-black text-indigo-700/15" aria-hidden="true">{new Date(event.starts_at).getDate()}</span></div>
        <div className="p-5"><h2 className="text-xl font-bold tracking-tight text-slate-950 group-hover:text-indigo-700"><Link href={`/events/${event.id}`} target="_blank" rel="noopener noreferrer" className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">{event.title}<span className="sr-only"> (opens in a new tab)</span></Link></h2>
        <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600">{event.description}</p>
        <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">When</dt>
            <dd className="mt-1 text-slate-900"><time dateTime={event.starts_at}>{start}</time></dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Where</dt>
            <dd className="mt-1 text-slate-900">{event.venue}</dd>
          </div>
          {event.capacity !== null && (
            <div>
              <dt className="font-medium text-slate-500">Capacity</dt>
              <dd className="mt-1 text-slate-900">{event.capacity} attendees</dd>
            </div>
          )}
        </dl><Link href={`/events/${event.id}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900">View event details <span className="ml-1" aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></Link></div>
      </article>
    </li>
  );
}

function RegistrationCards({ registrations, events }: {
  registrations: Array<{ id: string; event_id: string; status: "registered" | "cancelled"; attendance: "pending" | "attended" | "absent" }>;
  events: Array<{ id: string; title: string; starts_at: string; ends_at: string; venue: string }>;
}) {
  return <ul className="mt-3 grid gap-3 md:grid-cols-2">{registrations.map((registration) => { const event = events.find((row) => row.id === registration.event_id); return <li key={registration.id} className="rounded-xl border border-slate-200 p-4"><h4 className="font-semibold text-slate-900">{event?.title ?? "Event"}</h4>{event && <p className="mt-1 text-sm text-slate-600">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.starts_at))} · {event.venue}</p>}<p className="mt-2 text-sm text-slate-600">Registration: {registration.status} · Attendance: {registration.attendance}</p><Link href={`/events/${registration.event_id}`} className="mt-2 inline-block text-sm font-semibold text-indigo-700">Event details →</Link></li>; })}</ul>;
}

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row" aria-busy="true">
      <div className="hidden md:block md:w-64 lg:w-72 border-r border-slate-200 bg-white p-6 h-screen sticky top-0" />
      <div className="flex-1 min-w-0">
        <main className="min-h-screen bg-[#f7f8fc] px-5 py-10">
          <div className="mx-auto max-w-7xl animate-pulse">
            <div className="h-16 rounded-2xl bg-white" />
            <div className="mt-8 h-48 rounded-[2rem] bg-indigo-100" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="h-64 rounded-3xl bg-white" />
              <div className="h-64 rounded-3xl bg-white" />
            </div>
            <p className="sr-only">Loading your dashboard…</p>
          </div>
        </main>
      </div>
    </div>
  );
}
