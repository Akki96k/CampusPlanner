import type { createClient } from "@/backend/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function loadNotificationSnapshot(supabase: ServerSupabaseClient) {
  const [listResult, unreadResult] = await Promise.all([
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);

  return {
    notifications: listResult.data ?? [],
    unreadCount: unreadResult.count ?? 0,
    error: listResult.error ?? unreadResult.error,
  };
}
