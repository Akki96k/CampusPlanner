"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/backend/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
