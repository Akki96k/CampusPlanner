"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserRole } from "@/backend/lib/auth/require-role";
import { sendOrganizerOutboxMessage } from "@/backend/lib/email/organizer-outbox";
import { validateOrganizerProfileUpdate } from "@/backend/lib/auth/organizer-profile";
import { validateNewOrganizerInput, validateDeactivationReason } from "@/backend/lib/auth/organizer-management";
import { createAdminClient } from "@/backend/lib/supabase/admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decisions = ["approved", "rejected", "removed"] as const;

export async function manageOrganizerAction(formData: FormData): Promise<void> {
  const { supabase, userId: actorId } = await requireUserRole("faculty_admin");
  const organizerId = formData.get("organizerId");
  const status = formData.get("status");
  const rawReason = formData.get("reason");

  if (typeof organizerId !== "string" || !uuidPattern.test(organizerId) || typeof status !== "string" || !(decisions as readonly string[]).includes(status)) {
    redirect("/faculty/organizers?result=invalid");
  }

  if (organizerId === actorId) {
    redirect("/faculty/organizers?result=unauthorized");
  }

  const requestedStatus = status as typeof decisions[number];
  let reason = "";
  if (requestedStatus === "rejected" || requestedStatus === "removed") {
    const reasonValidation = validateDeactivationReason(rawReason);
    if (!reasonValidation.success) {
      redirect("/faculty/organizers?result=reason-required");
    }
    reason = reasonValidation.reason;
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
  const { supabase, userId: actorId } = await requireUserRole("faculty_admin");

  const validation = validateOrganizerProfileUpdate(formData);
  if (!validation.success) {
    if (validation.error === "unauthorized-status-change" || validation.error === "invalid-id") {
      redirect("/faculty/organizers?result=invalid");
    }
    redirect("/faculty/organizers?result=profile-invalid");
  }

  const { organizerId, displayName } = validation.data;

  // Prevent modifying the faculty member's own profile via organizer management
  if (organizerId === actorId) {
    redirect("/faculty/organizers?result=unauthorized");
  }

  const { error } = await supabase.rpc("update_organizer_profile", {
    target_organizer: organizerId,
    new_display_name: displayName,
  });

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

export async function createOrganizerAction(formData: FormData): Promise<void> {
  const { supabase, userId: actorId } = await requireUserRole("faculty_admin");

  const validation = validateNewOrganizerInput(formData);
  if (!validation.success) {
    if (validation.error === "invalid-name") redirect("/faculty/organizers?result=create-name-invalid");
    if (validation.error === "invalid-email") redirect("/faculty/organizers?result=create-email-invalid");
    if (validation.error === "invalid-password") redirect("/faculty/organizers?result=create-password-invalid");
    redirect("/faculty/organizers?result=create-invalid");
  }

  const { displayName, email, password, initialStatus } = validation.data;

  const admin = createAdminClient();
  if (!admin) {
    redirect("/faculty/organizers?result=admin-key-missing");
  }

  // Provision the organizer user using the server-side Supabase Admin API
  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      account_role: "organizer",
      display_name: displayName,
    },
  });

  if (createError) {
    const errorMsg = createError.message?.toLowerCase() ?? "";
    if (createError.status === 422 || errorMsg.includes("already registered") || errorMsg.includes("already exists")) {
      redirect("/faculty/organizers?result=email-exists");
    }
    console.error("Admin createUser failed:", createError);
    redirect("/faculty/organizers?result=create-error");
  }

  const newUserId = authData?.user?.id;
  if (!newUserId) {
    redirect("/faculty/organizers?result=create-error");
  }

  // If initialStatus is approved, activate the organizer application immediately
  if (initialStatus === "approved") {
    const { error: approveError } = await supabase.rpc("faculty_approve_new_organizer", {
      target_organizer: newUserId,
    });

    if (approveError) {
      // Fallback: update directly via admin client if migration RPC is not cached
      await admin.from("organizer_applications").upsert({
        organizer_id: newUserId,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: actorId,
        decided_at: new Date().toISOString(),
        decided_by: actorId,
      });
    }
  }

  revalidatePath("/faculty/organizers");
  revalidatePath("/dashboard");
  revalidatePath("/organizer");
  revalidatePath("/faculty");
  redirect("/faculty/organizers?result=organizer-created");
}

export async function deleteOrganizerAction(formData: FormData): Promise<void> {
  const { supabase, userId: actorId } = await requireUserRole("faculty_admin");

  const organizerId = formData.get("organizerId");
  if (typeof organizerId !== "string" || !uuidPattern.test(organizerId)) {
    redirect("/faculty/organizers?result=invalid");
  }

  if (organizerId === actorId) {
    redirect("/faculty/organizers?result=unauthorized");
  }

  const admin = createAdminClient();
  if (!admin) {
    redirect("/faculty/organizers?result=admin-key-missing");
  }

  // Check event count to protect historical data
  const { data: countData, error: countError } = await supabase.rpc("organizer_events_count", {
    target_organizer: organizerId,
  });

  let hasEvents = false;
  if (!countError && typeof countData === "number") {
    hasEvents = countData > 0;
  } else {
    const { count } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", organizerId);
    hasEvents = (count ?? 0) > 0;
  }

  if (hasEvents) {
    redirect("/faculty/organizers?result=cannot-delete-has-events");
  }

  // Safe to delete: remove database records first
  const { error: rpcError } = await supabase.rpc("faculty_delete_organizer", {
    target_organizer: organizerId,
  });

  if (rpcError && rpcError.code !== "PGRST202" && rpcError.code !== "42883") {
    if (rpcError.code === "23503") {
      redirect("/faculty/organizers?result=cannot-delete-has-events");
    }
    console.error("faculty_delete_organizer failed:", rpcError);
    redirect("/faculty/organizers?result=error");
  }

  // Delete from auth.users via Supabase Admin API
  const { error: authError } = await admin.auth.admin.deleteUser(organizerId);
  if (authError) {
    console.error("Failed to delete user in auth.users:", authError);
  }

  revalidatePath("/faculty/organizers");
  revalidatePath("/dashboard");
  revalidatePath("/organizer");
  revalidatePath("/faculty");
  redirect("/faculty/organizers?result=organizer-deleted");
}
