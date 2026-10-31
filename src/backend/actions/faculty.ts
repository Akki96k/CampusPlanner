"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserRole } from "@/backend/lib/auth/require-role";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function reviewEvent(formData: FormData, status: "approved" | "rejected"): Promise<void> {
  const { supabase, userId } = await requireUserRole("faculty_admin");
  const eventId = formData.get("eventId");
  if (typeof eventId !== "string" || !uuidPattern.test(eventId)) {
    redirect("/faculty?status=invalid");
  }

  if (status === "rejected") {
    const rawRemark = formData.get("remark");
    const remark = typeof rawRemark === "string" ? rawRemark.trim().replace(/\s+/g, " ") : "";
    if (!remark || remark.length > 2000) redirect("/faculty?status=remark-required");

    const { data, error } = await supabase.rpc("reject_event_with_remark", {
      target_event: eventId,
      rejection_remark: remark,
    });
    if (error?.code === "P0001") redirect("/faculty?status=not-pending");
    if (error) redirect("/faculty?status=error");
    if (!data) redirect("/faculty?status=not-pending");

    revalidatePath("/faculty");
    revalidatePath("/organizer");
    redirect("/faculty?status=rejected");
  }

  const { data, error } = await supabase
    .from("events")
    .update({ status, approved_by: status === "approved" ? userId : null })
    .eq("id", eventId)
    .eq("status", "pending_approval")
    .select("id")
    .maybeSingle();

  if (error) {
    redirect("/faculty?status=error");
  }
  if (!data) {
    redirect("/faculty?status=not-pending");
  }

  revalidatePath("/faculty");
  revalidatePath("/dashboard");
  redirect(`/faculty?status=${status}`);
}

export async function approveEventAction(formData: FormData): Promise<void> {
  await reviewEvent(formData, "approved");
}

export async function rejectEventAction(formData: FormData): Promise<void> {
  await reviewEvent(formData, "rejected");
}
