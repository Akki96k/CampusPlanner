import Link from "next/link";

export function EventPageHeader({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="text-lg font-bold tracking-tight text-slate-950" aria-label="CampusPlanner home">
        Campus<span className="text-indigo-600">Planner</span>
      </Link>
      <Link href={backHref} className="rounded-xl px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        ← {backLabel}
      </Link>
    </header>
  );
}
