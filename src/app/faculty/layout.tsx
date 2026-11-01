import type { ReactNode } from "react";
import { FacultySidebar } from "@/app/faculty/faculty-sidebar";

export default function FacultyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <FacultySidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

