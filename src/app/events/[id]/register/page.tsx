import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { registerForEventAction } from "@/backend/actions/registration";
import { EventPageHeader } from "@/components/event-page-header";
import { RegistrationSubmitButton } from "@/components/registration-submit-button";
import { createClient } from "@/backend/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const messages: Record<string, { text: string; tone: string }> = {
  duplicate: { text: "You already have a registration for this event. Your current status is shown below.", tone: "border-amber-200 bg-amber-50 text-amber-950" },
  full: { text: "This event has reached capacity and can no longer accept registrations.", tone: "border-amber-200 bg-amber-50 text-amber-950" },
  closed: { text: "Registration is closed for this event.", tone: "border-amber-200 bg-amber-50 text-amber-950" },
  invalid: { text: "Please review the highlighted fields and correct any missing or invalid information.", tone: "border-rose-200 bg-rose-50 text-rose-950" },
  error: { text: "We couldn’t save your registration. Please try again in a moment.", tone: "border-rose-200 bg-rose-50 text-rose-950" },
};

type RegisterPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ registration?: string }>;
};

export default function RegisterForEventPage(props: RegisterPageProps) {
  return <Suspense fallback={<RegistrationLoading />}><RegistrationContent {...props} /></Suspense>;
}

async function RegistrationContent({ params, searchParams }: RegisterPageProps) {
  await connection();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!uuidPattern.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: event }, { data: claims, error: claimsError }] = await Promise.all([
    supabase.from("events").select("id, title, starts_at, venue, registration_deadline").eq("id", id).eq("status", "approved").maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  if (!event) notFound();

  const userId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  const [{ data: profile }, { data: existingRegistration, error: registrationError }] = await Promise.all([
    userId ? supabase.from("profiles").select("role, display_name").eq("id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    userId ? supabase.from("event_registrations").select("id, status, attendance").eq("event_id", id).eq("student_id", userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const isStudent = !claimsError && profile?.role === "student";
  const startsAt = new Date(event.starts_at);
  const now = new Date();
  const registrationOpen = startsAt.getTime() > now.getTime() && (!event.registration_deadline || new Date(event.registration_deadline).getTime() > now.getTime());
  const feedback = query.registration ? messages[query.registration] : undefined;
  const registrationFailedToLoad = Boolean(userId && registrationError);

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-6 text-slate-950 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <EventPageHeader backHref={`/events/${id}`} backLabel="Back to Event" />

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 py-8 text-white sm:px-10 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-100">CampusPlanner · Student Registration</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Register for Event</h1>
            <h2 className="mt-5 text-xl font-semibold">{event.title}</h2>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-indigo-50">
              <p><span aria-hidden="true">◷ </span><time dateTime={event.starts_at}>{new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short" }).format(startsAt)}</time></p>
              <p><span aria-hidden="true">⌖ </span>{event.venue}</p>
            </div>
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            {feedback && <p role={query.registration === "error" || query.registration === "invalid" ? "alert" : "status"} className={`mb-6 rounded-xl border p-4 text-sm ${feedback.tone}`}>{feedback.text}</p>}

            {registrationFailedToLoad ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">We couldn’t check your registration status. Refresh the page before submitting.</p>
            ) : existingRegistration ? (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7" aria-labelledby="existing-registration-heading">
                {query.registration === "success" ? <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">Registration complete</p> : null}
                <h3 id="existing-registration-heading" className="mt-1 text-xl font-bold text-emerald-950">{existingRegistration.status === "registered" ? "You’re registered for this event" : "A registration record already exists"}</h3>
                <p className="mt-2 text-sm text-emerald-900">Registration status: <strong className="capitalize">{existingRegistration.status}</strong><br />Attendance status: <strong className="capitalize">{existingRegistration.attendance}</strong></p>
                <Link href="/dashboard" className="mt-5 inline-flex rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-900">Go to My Events</Link>
              </section>
            ) : !userId || !isStudent ? (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7">
                <h3 className="text-lg font-bold text-slate-950">Student account required</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Sign in with a student account to register for this event.</p>
                <Link href={!userId ? `/login?next=${encodeURIComponent(`/events/${id}/register`)}` : "/dashboard"} className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">{!userId ? "Sign in" : "Back to Dashboard"}</Link>
              </section>
            ) : !registrationOpen || query.registration === "full" ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><h3 className="font-bold">{query.registration === "full" ? "Event is full" : "Registration is closed"}</h3><p className="mt-1 text-sm">This event is no longer accepting registrations.</p></section>
            ) : (
              <form action={registerForEventAction} className="space-y-7">
                <input type="hidden" name="eventId" value={event.id} />
                <p className="text-sm text-slate-600"><span className="text-rose-700" aria-hidden="true">*</span> Required fields</p>

                <fieldset className="rounded-2xl border border-slate-200 p-4 sm:p-6">
                  <legend className="px-2 text-lg font-bold text-slate-950">A. Personal Information</legend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField id="fullName" name="fullName" label="Full name" required maxLength={120} autoComplete="name" minLength={2} defaultValue={profile?.display_name ?? ""} placeholder="Your full name" />
                    <FormField id="email" name="email" label="Active email address" required type="email" maxLength={254} autoComplete="email" defaultValue={typeof claims?.claims?.email === "string" ? claims.claims.email : ""} placeholder="you@college.edu" />
                    <FormField id="phone" name="phone" label="Phone number" required type="tel" maxLength={30} autoComplete="tel" pattern="[+]?[0-9() .-]{7,30}" placeholder="+1 555 123 4567" hint="Use 7–30 digits, spaces, or phone punctuation." />
                  </div>
                </fieldset>

                <fieldset className="rounded-2xl border border-slate-200 p-4 sm:p-6">
                  <legend className="px-2 text-lg font-bold text-slate-950">B. College Information</legend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField id="collegeName" name="collegeName" label="College / university name" required minLength={2} maxLength={160} autoComplete="organization" placeholder="Your college or university" />
                    <FormField id="studentNumber" name="studentNumber" label="Student ID / roll number" required maxLength={60} placeholder="Your student ID" />
                  </div>
                </fieldset>

                <fieldset className="rounded-2xl border border-slate-200 p-4 sm:p-6">
                  <legend className="px-2 text-lg font-bold text-slate-950">C. Education</legend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField id="yearOrSemester" name="yearOrSemester" label="Current year or semester" required maxLength={40} placeholder="e.g. Year 2 / Semester 4" />
                    <FormField id="graduationYear" name="graduationYear" label="Expected graduation year" required type="number" min={now.getFullYear()} max={now.getFullYear() + 15} defaultValue={now.getFullYear() + 2} hint="Enter a year from this year through the next 15 years." />
                  </div>
                </fieldset>

                <fieldset className="rounded-2xl border border-slate-200 p-4 sm:p-6">
                  <legend className="px-2 text-lg font-bold text-slate-950">D. Participation Type</legend>
                  <p className="mb-4 text-sm text-slate-600">Choose how you’ll participate.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ParticipationOption value="solo" title="Solo" description="I’m participating on my own." icon="◉" />
                    <ParticipationOption value="team" title="Team" description="I’m participating as part of a team." icon="✳" />
                  </div>
                </fieldset>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-lg text-xs leading-5 text-slate-500">Your registration details are visible only to you and authorized event organizers or faculty administrators.</p>
                  <RegistrationSubmitButton />
                </div>
              </form>
            )}
          </div>
        </section>

        <footer className="py-6 text-center text-xs text-slate-500">CampusPlanner · Bringing campus events together</footer>
      </div>
    </main>
  );
}

function FormField(props: {
  id: string; name: string; label: string; required?: boolean; type?: string; maxLength?: number;
  minLength?: number; min?: number; max?: number; autoComplete?: string; defaultValue?: string | number;
  placeholder?: string; pattern?: string; hint?: string;
}) {
  const { id, name, label, required = false, type = "text", ...inputProps } = props;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">{label}{required && <span className="ml-1 text-rose-700" aria-hidden="true">*</span>}</label>
      <input id={id} name={name} type={type} required={required} aria-required={required || undefined} aria-describedby={props.hint ? `${id}-hint` : undefined} {...inputProps} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100" />
      {props.hint && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-slate-500">{props.hint}</p>}
    </div>
  );
}

function ParticipationOption({ value, title, description, icon }: { value: "solo" | "team"; title: string; description: string; icon: string }) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-white p-4 transition hover:border-indigo-400 has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50 has-[:checked]:ring-2 has-[:checked]:ring-indigo-100">
      <input type="radio" name="participationType" value={value} required defaultChecked={value === "solo"} className="mt-1 size-4 accent-indigo-600" />
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-indigo-100 text-lg font-bold text-indigo-800" aria-hidden="true">{icon}</span>
      <span><span className="block font-bold text-slate-950">{title}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{description}</span></span>
    </label>
  );
}

function RegistrationLoading() {
  return <main className="min-h-screen bg-[#f7f8fc] px-4 py-8" aria-busy="true"><div className="mx-auto max-w-5xl animate-pulse"><div className="h-10 w-48 rounded-xl bg-white" /><div className="mt-8 h-40 rounded-[2rem] bg-indigo-100" /><div className="mt-6 h-[36rem] rounded-[2rem] bg-white" /><p className="sr-only">Loading registration form…</p></div></main>;
}
