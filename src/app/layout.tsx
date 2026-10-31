import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeControl } from "@/components/theme-control";

export const metadata: Metadata = {
  title: { default: "CampusPlanner", template: "%s | CampusPlanner" },
  description: "Discover campus events, register with ease, and bring your campus community together.",
  openGraph: { title: "CampusPlanner", description: "Discover campus events and bring your campus community together.", siteName: "CampusPlanner", type: "website" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('campusconnect-theme')||'system';const d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.themeChoice=t}catch{}` }} /></head>
      <body className="min-h-full flex flex-col">{children}<ThemeControl /></body>
    </html>
  );
}
