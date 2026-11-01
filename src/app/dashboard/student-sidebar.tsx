"use client";

import Link from "next/link";
import { useState } from "react";
import { signOutAction } from "@/backend/actions/dashboard";

export type StudentSidebarProps = {
  email: string;
};

export const STUDENT_DASHBOARD_TITLE = "Student Dashboard";

export function formatStudentDisplayEmail(email: string): string {
  const trimmed = email.trim();
  return trimmed || "Signed-in student";
}

export function StudentSidebar({ email }: StudentSidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayEmail = formatStudentDisplayEmail(email);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="flex md:hidden items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <Link href="/dashboard" className="text-lg font-bold tracking-tight text-indigo-800">
            Student Dashboard
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
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Signed in as</p>
              <p className="text-sm font-semibold text-slate-900 truncate" title={displayEmail}>{displayEmail}</p>
            </div>
          </div>
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
        aria-label="Student Sidebar"
      >
        <div>
          {/* Header */}
          <div className="pb-6 border-b border-slate-100">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight text-indigo-800 block hover:text-indigo-900 transition">
              Student Dashboard
            </Link>
          </div>

          {/* Account Profile Section */}
          <div className="mt-6">
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Account
            </p>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Signed in as
                </p>
                <p className="text-sm font-semibold text-slate-900 truncate" title={displayEmail}>
                  {displayEmail}
                </p>
              </div>
            </div>
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
