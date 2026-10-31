"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserRole } from "@/backend/lib/auth/require-role";
import { validateEventDraft } from "@/backend/lib/events/validation";
import type { EventFormState } from "@/backend/lib/events/action-state";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createEventAction(
  _previousState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { supabase, userId } = await requireUserRole("organizer");
  const validation = validateEventDraft(formData);

  if (!validation.success) {
    return { status: "error", message: validation.message };
  }

  const { event } = validation;
  const eventId = formData.get("eventId");
  const values = {
    title: event.title,
    description: event.description,
    category: event.category,
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    venue: event.venue,
    capacity: event.capacity,
    registration_deadline: event.registrationDeadline,
  };
  if (typeof eventId === "string" && eventId) {
    if (!uuidPattern.test(eventId)) {
      return { status: "error", message: "That event could not be updated. Refresh and try again." };
    }
    const { data, error } = await supabase.from("events")
      .update({ ...values, status: "draft" })
      .eq("id", eventId)
      .eq("organizer_id", userId)
      .in("status", ["draft", "rejected"])
      .select("id")
      .maybeSingle();
    if (error || !data) {
      return { status: "error", message: "That event could not be updated. Refresh and try again." };
    }
  } else {
    const { error } = await supabase.from("events").insert({
      ...values,
      organizer_id: userId,
      status: "draft",
    });
    if (error) {
      return { status: "error", message: "We couldn’t save the event. Please check the details and try again." };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/organizer");
  return { status: "success", message: eventId ? "Draft updated. Review it below and submit it when it’s ready." : "Draft saved. Review it below and submit it when it’s ready." };
}

export async function submitEventForApprovalAction(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireUserRole("organizer");
  const eventId = formData.get("eventId");
  if (typeof eventId !== "string" || !uuidPattern.test(eventId)) {
    redirect("/organizer?status=invalid");
  }

  const { data, error } = await supabase
    .from("events")
    .update({ status: "pending_approval" })
    .eq("id", eventId)
    .eq("organizer_id", userId)
    .in("status", ["draft", "rejected"])
    .select("id")
    .maybeSingle();

  if (error) {
    redirect("/organizer?status=error");
  }
  if (!data) {
    redirect("/organizer?status=not-submittable");
  }

  revalidatePath("/organizer");
  revalidatePath("/faculty");
  redirect("/organizer?status=submitted");
}
