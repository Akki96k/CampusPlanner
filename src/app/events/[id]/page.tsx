import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/backend/lib/supabase/server";
import { EventPageHeader } from "@/components/event-page-header";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<EventLoading />}><EventDetailsContent params={params} /></Suspense>;
}

async function EventDetailsContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: event }, { data: claims }] = await Promise.all([
    supabase
    .from("events")
    .select("id, title, description, category, starts_at, ends_at, venue, capacity, registration_deadline")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  if (!event) notFound();

  let role: string | null = null;
  let existingRegistration: { status: string; attendance: string } | null = null;
  if (typeof claims?.claims?.sub === "string") {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", claims.claims.sub).maybeSingle();
    role = profile?.role ?? null;
    if (role === "student") {
      const { data } = await supabase.from("event_registrations").select("status, attendance").eq("event_id", id).eq("student_id", claims.claims.sub).maybeSingle();
      existingRegistration = data;
    }
  }

  const startsAt = new Date(event.starts_at);
  const endsAt = new Date(event.ends_at);
  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-6 text-slate-950 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <EventPageHeader backHref="/" backLabel="All events" />
        <article className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-12 text-white sm:px-12 sm:py-16">
            <span className="inline-flex rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur">{event.category}</span>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{event.title}</h1>
            <p className="mt-4 text-sm text-white/80">A campus event, reviewed and approved for students.</p>
          </div>
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_18rem]">
            <section><h2 className="text-lg font-bold">About this event</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{event.description}</p></section>
            <aside className="rounded-2xl bg-slate-50 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Event details</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div><dt className="font-semibold text-slate-500">Date and time</dt><dd className="mt-1 text-slate-900"><time dateTime={event.starts_at}>{new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short" }).format(startsAt)}</time><span className="block mt-1 text-slate-500">Ends {new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(endsAt)}</span></dd></div>
                <div><dt className="font-semibold text-slate-500">Location</dt><dd className="mt-1 text-slate-900">{event.venue}</dd></div>
                <div><dt className="font-semibold text-slate-500">Capacity</dt><dd className="mt-1 text-slate-900">{event.capacity === null ? "Not specified" : `${event.capacity} attendees`}</dd></div>
                {event.registration_deadline && <div><dt className="font-semibold text-slate-500">Registration deadline</dt><dd className="mt-1 text-slate-900">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.registration_deadline))}</dd></div>}
              </dl>
              {existingRegistration ? <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-semibold">Registration: {existingRegistration.status}</p><p className="mt-1">Attendance: {existingRegistration.attendance}</p><Link href="/dashboard" className="mt-3 inline-flex font-semibold text-indigo-700 underline">View My Events</Link></div>
                : role === "student" ? <Link href={`/events/${event.id}/register`} target="_blank" rel="noopener noreferrer" className="mt-6 flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">Register for Event <span className="ml-2" aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></Link>
                : <Link href={role ? "/dashboard" : "/login?next=" + encodeURIComponent(`/events/${event.id}`)} className="mt-6 flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">{role ? "Student registration only" : "Sign in to register"}</Link>}
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}

function EventLoading() {
  return <main className="min-h-screen bg-[#f7f8fc] px-5 py-8" aria-busy="true"><div className="mx-auto max-w-4xl animate-pulse"><div className="h-10 w-48 rounded bg-slate-200" /><div className="mt-8 h-64 rounded-[2rem] bg-indigo-100" /><p className="sr-only">Loading event details…</p></div></main>;
}
