"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/backend/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NotificationActionResult = { success: boolean };

async function requireNotificationRecipient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "organizer" && profile?.role !== "faculty_admin") redirect("/dashboard");
  return { supabase, userId, role: profile.role };
}

export async function markNotificationReadAction(notificationId: string): Promise<NotificationActionResult> {
  if (typeof notificationId !== "string" || !uuidPattern.test(notificationId)) return { success: false };
  const { supabase, userId, role } = await requireNotificationRecipient();
  const { error } = await supabase.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) return { success: false };
  revalidatePath(role === "organizer" ? "/organizer" : "/faculty");
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const { supabase, userId, role } = await requireNotificationRecipient();
  const { error } = await supabase.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) return { success: false };
  revalidatePath(role === "organizer" ? "/organizer" : "/faculty");
  return { success: true };
}
