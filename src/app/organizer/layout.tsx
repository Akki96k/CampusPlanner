import type { ReactNode } from "react";
import { OrganizerSidebar } from "@/app/organizer/organizer-sidebar";

export default function OrganizerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <OrganizerSidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

