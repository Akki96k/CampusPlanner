"use client";

import { useEffect } from "react";

type ThemeChoice = "system" | "light" | "dark";

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): "light" | "dark" {
  return choice === "dark" || (choice === "system" && prefersDark) ? "dark" : "light";
}

function applyTheme(choice: ThemeChoice) {
  document.documentElement.dataset.theme = resolveTheme(choice, window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.themeChoice = choice;
}

export function ThemeControl() {
  useEffect(() => {
    const saved = localStorage.getItem("campusconnect-theme");
    const initial: ThemeChoice = saved === "light" || saved === "dark" ? saved : "system";
    const select = document.getElementById("campusconnect-theme-select");
    if (select instanceof HTMLSelectElement) select.value = initial;
    applyTheme(initial);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => { if (initial === "system") applyTheme("system"); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return <label className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg"><span>Theme</span><select id="campusconnect-theme-select" aria-label="Choose theme" defaultValue="system" onChange={(e) => { const value = e.target.value as ThemeChoice; localStorage.setItem("campusconnect-theme", value); applyTheme(value); }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
