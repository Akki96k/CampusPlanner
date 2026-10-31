import { redirect } from "next/navigation";
import { createClient } from "@/backend/lib/supabase/server";
import type { Database } from "@/backend/lib/supabase/database.types";

type AppRole = Database["public"]["Enums"]["app_role"];

export async function requireUserRole(role: AppRole) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || profile?.role !== role) {
    redirect("/dashboard");
  }

  if (role === "organizer") {
    const { data: application, error: applicationError } = await supabase
      .from("organizer_applications")
      .select("status")
      .eq("organizer_id", userId)
      .maybeSingle();
    if (applicationError || application?.status !== "approved") {
      redirect(`/organizer/access?status=${application?.status ?? "pending"}`);
    }
  }

  return { supabase, userId };
}
