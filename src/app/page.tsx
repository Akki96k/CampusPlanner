import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { escapeLikePattern, parseEventSearch } from "@/backend/lib/events/search";
import type { CampusEvent } from "@/backend/lib/supabase/database.types";
import { LoginRoleDropdown } from "@/components/login-role-dropdown";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Explore Events" };

type HomeProps = {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
};

export default function Home({ searchParams }: HomeProps) {
  return <Suspense fallback={<HomeLoading />}><HomeContent searchParams={searchParams} /></Suspense>;
}

async function HomeContent({ searchParams }: HomeProps) {
  await connection();
  const params = await searchParams;
  const search = parseEventSearch(params.q);
  const selectedCategory = typeof params.category === "string" && params.category.length <= 60
    ? params.category
    : "All events";
  const supabase = await createClient();
  const categoryResult = await supabase
    .from("events")
    .select("category")
    .eq("status", "approved")
    .gte("starts_at", new Date().toISOString())
    .order("category", { ascending: true })
    .limit(100);
  const categoryOptions = ["All events", ...Array.from(new Set((categoryResult.data ?? []).map((event) => event.category))).sort((a, b) => a.localeCompare(b))];
  const categoryIsValid = categoryOptions.includes(selectedCategory);
  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "approved")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(60);

  if (search) query = query.ilike("title", `%${escapeLikePattern(search)}%`);
  if (categoryIsValid && selectedCategory !== "All events") query = query.ilike("category", selectedCategory);
  const eventResult = search === null ? { data: null, error: null } : await query;
  const events: CampusEvent[] = eventResult.data ?? [];
  const error = eventResult.error ?? categoryResult.error;
  const migrationMissing = error?.code === "42P01" || error?.code === "PGRST205";

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="site-nav relative z-20 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-7xl items-center justify-between rounded-2xl border px-4 py-3 shadow-sm sm:mt-5 sm:w-[calc(100%-3rem)] sm:px-6 lg:w-[calc(100%-5rem)]">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CampusPlanner home">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-200 sm:size-10 sm:text-lg">CP</span>
          <span className="hidden whitespace-nowrap text-sm font-bold tracking-tight min-[440px]:inline sm:text-lg">Campus<span className="text-indigo-600">Planner</span></span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-5">
          <Link href="/#events" aria-label="Explore Events" className="whitespace-nowrap rounded-xl px-1.5 py-2 text-xs font-semibold text-slate-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-indigo-600 sm:px-3 sm:text-sm"><span className="hidden min-[440px]:inline">Explore Events</span><span className="min-[440px]:hidden">Explore</span></Link>
          <LoginRoleDropdown />
        </nav>
      </header>

      <section className="hero-panel relative isolate mx-auto mt-5 grid grid-cols-1 max-w-7xl items-center gap-8 overflow-hidden rounded-[2rem] px-6 py-10 sm:mx-6 sm:px-10 sm:py-14 lg:mx-auto lg:min-h-[540px] lg:grid-cols-[1.02fr_.98fr] lg:gap-4 lg:px-14 lg:py-16">
        <div aria-hidden="true" className="hero-orb hero-orb-one" />
        <div aria-hidden="true" className="hero-orb hero-orb-two" />
        <div aria-hidden="true" className="hero-grid" />
        <div className="relative z-10 w-full min-w-0 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-indigo-100 shadow-sm backdrop-blur">
            <span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_14px_#22d3ee]" /> Your campus, closer than ever
          </div>
          <h1 className="mt-6 text-[clamp(2rem,8.5vw,3.75rem)] font-bold leading-[1.02] tracking-[-.055em] text-white sm:text-6xl lg:text-[4.25rem]"><span className="block sm:inline">Every Campus </span><span className="block sm:inline">Event,</span><br className="hidden sm:block"/><span className="hero-title-accent block sm:inline"> One Place.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-indigo-100/90 sm:text-lg sm:leading-8">Discover events, register with ease, and bring your campus community together.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/#events" className="hero-primary-button inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-950 shadow-lg shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Explore Events <span aria-hidden="true">↗</span></Link>
            <span className="text-sm font-medium text-indigo-100/75">Find your next campus moment</span>
          </div>
          <form action="/" method="get" className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 shadow-xl backdrop-blur-xl focus-within:border-cyan-200/70 focus-within:ring-4 focus-within:ring-cyan-200/15">
            <label className="sr-only" htmlFor="landing-search">Search campus events</label>
            <span aria-hidden="true" className="pl-2 text-xl text-cyan-200">⌕</span>
            <input id="landing-search" name="q" type="search" maxLength={80} defaultValue={search ?? ""} placeholder="Search events, topics, and more" className="min-w-0 flex-1 border-0 bg-transparent px-1 py-3 text-sm text-white outline-none placeholder:text-indigo-100/65 focus:ring-0" />
            <input type="hidden" name="category" value={selectedCategory} />
            <button className="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 sm:px-5">Search</button>
          </form>
        </div>
        <CampusHeroArt />
      </section>

      <section id="events" className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 sm:pt-10 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-bold uppercase tracking-[.16em] text-indigo-600">The campus calendar</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Find your kind of event</h2><p className="mt-3 text-slate-600">Real events, reviewed and shared by your campus community.</p></div>
        </div>

        <nav aria-label="Filter events by category" className="mt-7 flex gap-2 overflow-x-auto pb-2">
          {categoryOptions.map((category) => {
            const active = category === selectedCategory;
            const href = category === "All events" ? `/?${search ? `q=${encodeURIComponent(search)}&` : ""}#events` : `/?${search ? `q=${encodeURIComponent(search)}&` : ""}category=${encodeURIComponent(category)}#events`;
            return <Link key={category} href={href} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${active ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"}`}>{category}</Link>;
          })}
        </nav>

        {search === null ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900" role="alert">Please use one search phrase of 80 characters or fewer.</div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950" role="alert"><h3 className="font-bold">{migrationMissing ? "Events database setup needed" : "Events couldn’t load"}</h3><p className="mt-2 text-sm leading-6">{migrationMissing ? "Apply the SQL migrations in supabase/migrations/ to your Supabase project, then refresh this page." : "Please refresh in a moment. If the problem continues, check your Supabase connection."}</p></div>
        ) : events.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><span className="text-4xl" aria-hidden="true">✳</span><h3 className="mt-4 text-xl font-bold">{search || selectedCategory !== "All events" ? "No events match those filters" : "The next campus moment is waiting"}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{search || selectedCategory !== "All events" ? "Try another search or browse all events." : "There aren’t any upcoming approved events yet. Check back after organizers submit their plans."}</p>{(search || selectedCategory !== "All events") && <Link className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700" href="/">Clear filters</Link>}</div>
        ) : (
          <>
            <p className="mt-6 text-sm text-slate-500">Showing {events.length}{events.length === 60 ? "+" : ""} upcoming event{events.length === 1 ? "" : "s"}</p>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{events.map((event, index) => <LandingEventCard event={event} index={index} key={event.id} />)}</ul>
          </>
        )}
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10" aria-labelledby="how-it-works-heading">
        <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.16em] text-indigo-600">A campus life, well planned</p><h2 id="how-it-works-heading" className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">From curious to connected in three steps</h2><p className="mt-3 text-slate-600">Everything you need to find an event and make the most of it.</p></div>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          <HowStep number="01" title="Discover" description="Find events happening around campus, from workshops to celebrations." icon="⌕" />
          <HowStep number="02" title="Register" description="Save your place in a few moments with a simple registration flow." icon="✓" />
          <HowStep number="03" title="Participate" description="Show up, meet your people, and be part of campus life." icon="✦" />
        </ol>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-10" aria-labelledby="closing-cta-heading">
        <div className="closing-cta relative isolate overflow-hidden rounded-[2rem] px-6 py-10 text-center sm:px-12 sm:py-14">
          <div aria-hidden="true" className="cta-orb" />
          <div className="relative z-10 mx-auto max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-200">Make room for something new</p><h2 id="closing-cta-heading" className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Your next great campus moment is out there.</h2><p className="mt-4 text-sm leading-6 text-indigo-100 sm:text-base">Explore what’s happening and find the event that feels like yours.</p><Link href="/#events" className="hero-primary-button mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-950 transition hover:-translate-y-0.5 hover:bg-cyan-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Explore Events <span aria-hidden="true">↗</span></Link></div>
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><Link href="/" className="font-bold text-slate-800">Campus<span className="text-indigo-600">Planner</span></Link><p>Made for the moments that make campus.</p></div></footer>
    </main>
  );
}

function CampusHeroArt() {
  return <div className="hero-art relative z-10 mx-auto w-full max-w-[34rem]" aria-label="Illustration of students gathered in a campus courtyard">
    <div className="art-glass absolute inset-x-4 top-3 bottom-4 rounded-[2rem] border border-white/15 bg-white/[.06] shadow-2xl backdrop-blur-sm" />
    <svg className="relative h-auto w-full drop-shadow-2xl" viewBox="0 0 560 450" role="img" aria-label="A lively campus courtyard framed by modern college buildings">
      <defs><linearGradient id="campusSky" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#312e81"/><stop offset=".55" stopColor="#4f46e5"/><stop offset="1" stopColor="#0e7490"/></linearGradient><linearGradient id="campusGround" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#a5f3fc"/><stop offset="1" stopColor="#c4b5fd"/></linearGradient><linearGradient id="building" x1="0" x2="1"><stop stopColor="#e0e7ff"/><stop offset="1" stopColor="#c7d2fe"/></linearGradient></defs>
      <rect x="24" y="22" width="512" height="392" rx="34" fill="url(#campusSky)" stroke="#ffffff" strokeOpacity=".24" strokeWidth="2"/>
      <circle cx="434" cy="92" r="38" fill="#67e8f9" fillOpacity=".65"/><circle cx="434" cy="92" r="54" fill="#67e8f9" fillOpacity=".1"/>
      <path d="M45 240 149 153l116 86v119H45V240Z" fill="url(#building)"/><path d="M149 153v205M45 240h220M82 215v-26h29v26m55-30v-28h31v28m-115 83v-31h31v31m51 0v-31h31v31m-82 71v-39h35v39m52 0v-39h35v39" fill="none" stroke="#6366f1" strokeWidth="8" strokeLinejoin="round"/>
      <path d="m265 231 91-72 145 105v94H265V231Z" fill="#ddd6fe" fillOpacity=".93"/><path d="m356 159 0 199M280 250h200m-169 25v-34h32v34m41 0v-34h32v34m43 0v-34h24v34m-166 83v-48h42v48m54 0v-48h42v48" fill="none" stroke="#818cf8" strokeWidth="8" strokeLinejoin="round"/>
      <path d="M45 358h465v31H45z" fill="url(#campusGround)"/><path d="M119 389c41-54 90-54 131 0m65 0c41-66 96-66 139 0" fill="none" stroke="#ecfeff" strokeOpacity=".8" strokeWidth="6"/>
      <g className="art-person-one"><circle cx="203" cy="283" r="16" fill="#fbcfe8"/><path d="M183 305q20-17 40 0l10 53h-59l9-53Z" fill="#f472b6"/><path d="m190 356-7 32m32-32 7 32" stroke="#312e81" strokeWidth="9" strokeLinecap="round"/></g>
      <g className="art-person-two"><circle cx="336" cy="291" r="15" fill="#fde68a"/><path d="M316 311q20-16 40 0l8 47h-56l8-47Z" fill="#22d3ee"/><path d="m324 357-6 31m28-31 6 31" stroke="#312e81" strokeWidth="9" strokeLinecap="round"/></g>
      <g className="art-person-three"><circle cx="421" cy="284" r="14" fill="#fed7aa"/><path d="M402 303q19-15 38 0l7 55h-52l7-55Z" fill="#a78bfa"/><path d="m411 356-5 32m24-32 5 32" stroke="#312e81" strokeWidth="9" strokeLinecap="round"/></g>
      <path d="m97 111 7-15 7 15 15 7-15 7-7 15-7-15-15-7 15-7Zm334 117 5-11 5 11 11 5-11 5-5 11-5-11-11-5 11-5Z" fill="#a5f3fc"/>
    </svg>
    <div className="art-label art-label-top"><span className="art-label-dot"/> Discover your next thing</div>
    <div className="art-label art-label-bottom"><span className="art-label-icon">✦</span><span><strong>Campus comes alive</strong><small>Find a reason to show up</small></span></div>
  </div>;
}

function HowStep({ number, title, description, icon }: { number: string; title: string; description: string; icon: string }) {
  return <li className="how-card group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl sm:p-7"><div className="flex items-center justify-between"><span className="step-icon grid size-12 place-items-center rounded-2xl bg-indigo-50 text-xl font-semibold text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">{icon}</span><span className="text-sm font-bold tracking-[.16em] text-slate-400">{number}</span></div><h3 className="mt-5 text-xl font-bold tracking-tight text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></li>;
}

function LandingEventCard({ event, index }: { event: CampusEvent; index: number }) {
  const palettes = ["from-sky-100 to-indigo-100 text-indigo-700", "from-amber-100 to-orange-100 text-orange-700", "from-emerald-100 to-teal-100 text-teal-700", "from-fuchsia-100 to-pink-100 text-fuchsia-700"];
  const palette = palettes[index % palettes.length];
  const date = new Date(event.starts_at);
  return <li className="list-none"><article className="group h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
    <div className={`relative flex min-h-36 items-end justify-between bg-gradient-to-br ${palette} p-5`}><span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wide backdrop-blur">{event.category}</span><span className="text-6xl font-black leading-none opacity-20" aria-hidden="true">{event.category.slice(0, 1).toUpperCase()}</span><div className="absolute bottom-5 right-5 rounded-xl bg-white p-2 text-center shadow-sm"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{new Intl.DateTimeFormat("en", { month: "short" }).format(date)}</span><span className="block text-lg font-bold leading-5 text-slate-900">{new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date)}</span></div></div>
    <div className="p-5"><h3 className="text-lg font-bold leading-snug tracking-tight text-slate-900 group-hover:text-indigo-700"><Link href={`/events/${event.id}`} target="_blank" rel="noopener noreferrer" className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">{event.title}<span className="sr-only"> (opens in a new tab)</span></Link></h3><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{event.description}</p><div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500"><p><span className="mr-2 text-indigo-500" aria-hidden="true">◷</span><time dateTime={event.starts_at}>{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date)}</time></p><p><span className="mr-2 text-indigo-500" aria-hidden="true">⌖</span>{event.venue}</p><Link href={`/events/${event.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex pt-2 font-semibold text-indigo-700 hover:text-indigo-900">Event details <span className="ml-1" aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></Link></div></div>
  </article></li>;
}

function HomeLoading() {
  return <main className="min-h-screen bg-[#f7f8fc] px-5 py-8" aria-busy="true"><div className="mx-auto max-w-7xl animate-pulse"><div className="h-12 w-48 rounded-xl bg-white" /><div className="mt-12 grid gap-10 lg:grid-cols-2"><div className="h-80 rounded-3xl bg-indigo-100" /><div className="h-80 rounded-3xl bg-white" /></div><div className="mt-12 h-12 rounded-xl bg-white" /><p className="sr-only">Loading campus events…</p></div></main>;
}
