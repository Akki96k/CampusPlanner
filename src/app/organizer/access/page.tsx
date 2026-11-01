import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/backend/lib/supabase/server";
import { signOutAction } from "@/backend/actions/dashboard";
import { NotificationCenter } from "@/components/notification-center";
import { loadNotificationSnapshot } from "@/backend/lib/notifications/load";

export default function OrganizerAccessPage() {
  return (
    <Suspense fallback={<main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-10" aria-busy="true"><p className="text-sm text-slate-600">Loading organizer access…</p></main>}>
      <OrganizerAccessContent />
    </Suspense>
  );
}

async function OrganizerAccessContent() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") redirect("/login?role=organizer");

  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
    supabase.from("organizer_applications").select("status,rejected_reason,removed_reason").eq("organizer_id", userId).maybeSingle(),
  ]);
  if (profile?.role !== "organizer") redirect("/dashboard");
  const notificationSnapshot = await loadNotificationSnapshot(supabase);
  const status = application?.status ?? "pending";
  const copy = status === "approved"
    ? { title: "Organizer account approved", description: "Your organizer account is approved. You can access organizer tools and manage campus events.", reason: null }
    : status === "rejected"
    ? { title: "Organizer application not approved", description: "Faculty has not approved this organizer application. You cannot access organizer features.", reason: application?.rejected_reason }
    : status === "removed"
      ? { title: "Organizer access is restricted", description: "Faculty has removed access to organizer features.", reason: application?.removed_reason }
      : { title: "Organizer application pending", description: "Your organizer account is awaiting faculty approval. You will receive access to organizer features once your application has been approved.", reason: null };

  return <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-10"><section className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><div className="flex items-center justify-between"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">CampusPlanner</p><NotificationCenter userId={userId} role="organizer" initialNotifications={notificationSnapshot.notifications} initialUnreadCount={notificationSnapshot.unreadCount} /></div><h1 className="mt-5 text-2xl font-semibold text-slate-950">{copy.title}</h1><p className="mt-3 text-sm leading-6 text-slate-700">{copy.description}</p>{copy.reason && <div className="mt-5 rounded-xl bg-slate-50 p-4"><h2 className="text-sm font-semibold text-slate-900">Faculty reason</h2><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{copy.reason}</p></div>}<div className="mt-6 flex flex-wrap gap-3"><Link href={status === "approved" ? "/organizer" : "/dashboard"} className="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white">{status === "approved" ? "Open Organizer Dashboard" : "Browse events"}</Link><form action={signOutAction}><button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800">Sign out</button></form></div></section></main>;
}
