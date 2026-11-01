"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserRole } from "@/backend/lib/auth/require-role";
import { sendOrganizerOutboxMessage } from "@/backend/lib/email/organizer-outbox";
import { validateOrganizerProfileUpdate } from "@/backend/lib/auth/organizer-profile";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decisions = ["approved", "rejected", "removed"] as const;

export async function manageOrganizerAction(formData: FormData): Promise<void> {
  const { supabase } = await requireUserRole("faculty_admin");
  const organizerId = formData.get("organizerId");
  const status = formData.get("status");
  const rawReason = formData.get("reason");
  const reason = typeof rawReason === "string" ? rawReason.trim().replace(/\s+/g, " ") : "";

  if (typeof organizerId !== "string" || !uuidPattern.test(organizerId) || typeof status !== "string" || !(decisions as readonly string[]).includes(status)) {
    redirect("/faculty/organizers?result=invalid");
  }
  const requestedStatus = status as typeof decisions[number];
  if ((requestedStatus === "rejected" || requestedStatus === "removed") && (!reason || reason.length > 2000)) {
    redirect("/faculty/organizers?result=reason-required");
  }

  const { data: transitionId, error } = await supabase.rpc("manage_organizer_application", {
    target_organizer: organizerId,
    requested_status: requestedStatus,
    action_reason: reason || null,
  });
  if (error?.code === "42501") redirect("/faculty/organizers?result=unauthorized");
  if (error?.code === "P0001") redirect("/faculty/organizers?result=stale");
  if (error || !transitionId) redirect("/faculty/organizers?result=error");

  const emailResult = await sendOrganizerOutboxMessage(transitionId);
  revalidatePath("/faculty/organizers");
  revalidatePath("/dashboard");
  revalidatePath("/organizer");
  revalidatePath("/faculty");
  redirect(`/faculty/organizers?result=${emailResult === "sent" ? "updated" : "updated-email-pending"}`);
}

export async function updateOrganizerProfileAction(formData: FormData): Promise<void> {
  const { supabase } = await requireUserRole("faculty_admin");

  const validation = validateOrganizerProfileUpdate(formData);
  if (!validation.success) {
    if (validation.error === "unauthorized-status-change" || validation.error === "invalid-id") {
      redirect("/faculty/organizers?result=invalid");
    }
    redirect("/faculty/organizers?result=profile-invalid");
  }

  const { organizerId, displayName } = validation.data;

  const { error } = await supabase.rpc("update_organizer_profile", {
    target_organizer: organizerId,
    new_display_name: displayName,
  });

  if (error) {
    console.error("update_organizer_profile failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  if (error?.code === "42501") redirect("/faculty/organizers?result=unauthorized");
  if (error?.code === "P0002") redirect("/faculty/organizers?result=profile-not-found");
  if (error?.code === "22023") redirect("/faculty/organizers?result=profile-invalid");
  if (error?.code === "PGRST202" || error?.code === "42883") redirect("/faculty/organizers?result=migration-missing");
  if (error) redirect("/faculty/organizers?result=error");

  revalidatePath("/faculty/organizers");
  revalidatePath("/dashboard");
  revalidatePath("/organizer");
  revalidatePath("/faculty");
  redirect("/faculty/organizers?result=profile-updated");
}

