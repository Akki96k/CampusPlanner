"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutAction } from "@/backend/actions/dashboard";

export const ORGANIZER_NAV_ITEMS = [
  {
    label: "Browse Events",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.253 3.75m-18 0h21M4.5 7.5h15a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-15A2.25 2.25 0 0 1 2.25 18.75v-9A2.25 2.25 0 0 1 4.5 7.5Z" />
      </svg>
    ),
  },
  {
    label: "Organizer Tools",
    href: "/organizer",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.05a4.5 4.5 0 0 0 4.486-6.32l-3.27 3.27a1.5 1.5 0 0 1-2.122-2.122l3.27-3.27A4.5 4.5 0 0 0 16.5 2.25a4.48 4.48 0 0 0-3.32 1.482c-.854.853-1.282 2.002-1.208 3.14" />
      </svg>
    ),
  },
] as const;

export function isOrganizerNavActive(itemHref: string, currentPath: string): boolean {
  if (itemHref === "/organizer") {
    return currentPath === "/organizer" || currentPath.startsWith("/organizer/");
  }
  if (itemHref === "/dashboard") {
    return currentPath === "/dashboard" || currentPath.startsWith("/dashboard/");
  }
  return currentPath.startsWith(itemHref);
}

export function OrganizerSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="flex md:hidden items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <Link href="/organizer" className="text-lg font-bold tracking-tight text-indigo-800">
            Organizer Dashboard
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
          className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {mobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-5 py-4 shadow-sm animate-in slide-in-from-top-2">
          <nav aria-label="Organizer mobile navigation" className="space-y-1">
            {ORGANIZER_NAV_ITEMS.map((item) => {
              const active = isOrganizerNavActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-indigo-50 text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className={active ? "text-indigo-600" : "text-slate-400"}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 transition"
              >
                <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <aside
        className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-6 sticky top-0 h-screen overflow-y-auto"
        aria-label="Organizer Sidebar"
      >
        <div>
          {/* Header */}
          <div className="pb-6 border-b border-slate-100">
            <Link href="/organizer" className="text-xl font-bold tracking-tight text-indigo-800 block hover:text-indigo-900 transition">
              Organizer Dashboard
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="mt-6">
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Navigation
            </p>
            <nav aria-label="Organizer desktop navigation" className="mt-3 space-y-1.5">
              {ORGANIZER_NAV_ITEMS.map((item) => {
                const active = isOrganizerNavActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-indigo-50 text-indigo-700 shadow-xs ring-1 ring-indigo-200/50"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className={active ? "text-indigo-600" : "text-slate-400"}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer with Sign Out */}
        <div className="pt-6 border-t border-slate-100">
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

