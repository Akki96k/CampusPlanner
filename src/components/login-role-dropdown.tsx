"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const roles = [
  { key: "student", title: "Student", description: "Explore and register for events", icon: "cap" },
  { key: "organizer", title: "Organizer", description: "Create and manage events", icon: "calendar" },
  { key: "faculty_admin", title: "Faculty Member", description: "Review and approve events", icon: "shield" },
] as const;

function RoleIcon({ kind }: { kind: string }) {
  const common = { className: "size-5", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (kind === "cap") return <svg {...common}><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/></svg>;
  if (kind === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M12 13v6m-3-3h6"/></svg>;
  return <svg {...common}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg>;
}

export function LoginRoleDropdown() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickPinned = useRef(false);
  function closeMenu() {
    clickPinned.current = false;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(false);
  }
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { closeMenu(); rootRef.current?.querySelector("button")?.focus(); }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, []);

  return <div ref={rootRef} className="relative" onPointerEnter={(event) => { if (event.pointerType === "mouse") { if (hoverTimer.current) clearTimeout(hoverTimer.current); if (!clickPinned.current) setOpen(true); } }} onPointerLeave={(event) => { if (event.pointerType === "mouse") hoverTimer.current = setTimeout(closeMenu, 400); }}>
    <button type="button" aria-expanded={open} aria-controls="login-role-menu" onClick={() => { if (clickPinned.current) closeMenu(); else { if (hoverTimer.current) clearTimeout(hoverTimer.current); clickPinned.current = true; setOpen(true); } }} className="login-dropdown-trigger inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:min-h-11 sm:gap-2 sm:px-4 sm:text-sm">
      <svg aria-hidden="true" className="size-3.5 sm:size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5m5 5H3"/></svg>
      Login
      <svg aria-hidden="true" className={`size-3.5 sm:size-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.2 7.5a.75.75 0 0 1 1.06 0L10 11.19l3.74-3.7a.75.75 0 1 1 1.05 1.07l-4.27 4.22a.75.75 0 0 1-1.05 0L5.2 8.56a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></svg>
    </button>
    {open && <div className="absolute right-0 top-full z-40 w-[min(20rem,calc(100vw-2rem))] pt-2">
      <nav id="login-role-menu" aria-label="Choose your role to sign in" className="login-role-menu overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
      {roles.map((role) => <Link key={role.key} href={`/login?role=${role.key}`} onClick={closeMenu} className="login-role-option flex items-start gap-3 rounded-xl px-3 py-3 text-slate-800 transition hover:bg-indigo-50 focus-visible:bg-indigo-50 focus-visible:outline-none">
        <span className="login-role-icon mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><RoleIcon kind={role.icon} /></span>
        <span><span className="block text-sm font-semibold">{role.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{role.description}</span></span>
      </Link>)}
      </nav>
    </div>}
  </div>;
}
