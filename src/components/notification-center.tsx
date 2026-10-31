"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/backend/lib/supabase/client";
import type { Database } from "@/backend/lib/supabase/database.types";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/backend/actions/notifications";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type AppRole = "organizer" | "faculty_admin";

export function NotificationCenter({ userId, role, initialNotifications, initialUnreadCount }: {
  userId: string;
  role: AppRole;
  initialNotifications: Notification[];
  initialUnreadCount: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const [error, setError] = useState("");
  const seenIds = useRef(new Set(initialNotifications.map((item) => item.id)));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`notifications:${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}`,
      }, (payload) => {
        const incoming = payload.new as Notification;
        if (incoming.recipient_id !== userId || seenIds.current.has(incoming.id)) return;
        seenIds.current.add(incoming.id);
        setNotifications((current) => [incoming, ...current].slice(0, 50));
        setUnreadCount((count) => count + 1);
        setToast(incoming);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  const markRead = useCallback(async (id: string) => {
    const item = notifications.find((entry) => entry.id === id);
    if (!item || item.read_at) return;
    const result = await markNotificationReadAction(id);
    if (!result.success) { setError("Could not mark this notification as read. Please try again."); return; }
    setNotifications((current) => current.map((entry) => entry.id === id ? { ...entry, read_at: new Date().toISOString() } : entry));
    setUnreadCount((count) => Math.max(0, count - 1));
    setError("");
  }, [notifications]);

  async function markAllRead() {
    if (unreadCount === 0) return;
    const result = await markAllNotificationsReadAction();
    if (!result.success) { setError("Could not update notifications. Please try again."); return; }
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((entry) => entry.read_at ? entry : { ...entry, read_at: readAt }));
    setUnreadCount(0);
    setError("");
  }

  const linkFor = (item: Notification) => item.notification_type.startsWith("organizer_")
    ? "/organizer/access"
    : role === "organizer"
      ? `/organizer#event-${item.event_id}`
      : `/faculty#event-${item.event_id}`;
  const actionFor = (item: Notification) => item.notification_type === "event_rejected"
    ? "View remarks"
    : item.notification_type.startsWith("organizer_")
      ? "View account status"
      : "Review event";

  return (
    <div className="relative">
      <button type="button" onClick={() => setPanelOpen((open) => !open)} aria-expanded={panelOpen} aria-controls="notification-panel" aria-label={`Notifications, ${unreadCount} unread`} className="relative rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
        <span aria-hidden="true">♢</span> <span className="ml-1">Notifications</span>
        {unreadCount > 0 && <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-700 px-1.5 py-0.5 text-xs text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {panelOpen && <section id="notification-panel" aria-label="Notifications" className="absolute right-0 z-30 mt-2 max-h-[min(75vh,36rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-zinc-950">Notifications</h2><button type="button" onClick={markAllRead} disabled={!unreadCount} className="text-xs font-semibold text-indigo-700 underline disabled:cursor-not-allowed disabled:opacity-50">Mark all as read</button></div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-900">{error}</p>}
        {notifications.length === 0 ? <p className="py-8 text-center text-sm text-zinc-600">You’re all caught up.</p> : <ul className="mt-3 divide-y divide-zinc-100">{notifications.map((item) => <li key={item.id} className={`py-3 ${item.read_at ? "" : "rounded-lg bg-indigo-50 px-2"}`}>
          <div className="flex items-start gap-2"><span aria-label={item.read_at ? "Read" : "Unread"} className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read_at ? "bg-zinc-300" : "bg-indigo-600"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-zinc-950">{item.event_title}</p><p className="mt-1 text-sm leading-5 text-zinc-700">{item.message}</p><p className="mt-1 text-xs text-zinc-500">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</p><div className="mt-2 flex items-center gap-3"><Link href={linkFor(item)} onClick={() => { void markRead(item.id); setPanelOpen(false); }} className="text-sm font-semibold text-indigo-700 underline">{actionFor(item)}</Link>{!item.read_at && <button type="button" onClick={() => void markRead(item.id)} className="text-xs font-medium text-zinc-600 underline">Mark as read</button>}</div></div></div>
        </li>)}</ul>}
      </section>}

      {toast && <div role="status" aria-live="polite" className="fixed right-4 top-4 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-zinc-950">{toast.event_title}</p><p className="mt-1 text-sm text-zinc-700">{toast.message}</p><Link href={linkFor(toast)} onClick={() => { void markRead(toast.id); setToast(null); }} className="mt-3 inline-flex rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">{actionFor(toast)}</Link></div><button type="button" onClick={() => setToast(null)} aria-label="Close notification" className="rounded p-1 text-xl leading-none text-zinc-500 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">×</button></div>
      </div>}
    </div>
  );
}
