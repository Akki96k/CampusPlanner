"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserRole } from "@/backend/lib/auth/require-role";
import { validateRegistration } from "@/backend/lib/events/registration-validation";
import { createClient } from "@/backend/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function registerForEventAction(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireUserRole("student");
  const eventId = formData.get("eventId");
  if (typeof eventId !== "string" || !uuidPattern.test(eventId)) redirect("/dashboard?registration=invalid");
  const validation = validateRegistration(formData);
  if (!validation.success) redirect(`/events/${eventId}/register?registration=invalid`);
  const { data: event } = await supabase.from("events").select("id, status, starts_at, registration_deadline").eq("id", eventId).eq("status", "approved").maybeSingle();
  if (!event || new Date(event.starts_at).getTime() <= Date.now() || (event.registration_deadline && new Date(event.registration_deadline).getTime() <= Date.now())) redirect(`/events/${eventId}/register?registration=closed`);
  const { error } = await supabase.from("event_registrations").insert({
    event_id: eventId, student_id: userId, full_name: validation.value.fullName, email: validation.value.email,
    phone: validation.value.phone, college_name: validation.value.collegeName, student_number: validation.value.studentNumber,
    year_or_semester: validation.value.yearOrSemester, graduation_year: validation.value.graduationYear,
    participation_type: validation.value.participationType,
  });
  if (error?.code === "23505") redirect(`/events/${eventId}/register?registration=duplicate`);
  if (error?.code === "23514" && error.message.toLowerCase().includes("capacity")) redirect(`/events/${eventId}/register?registration=full`);
  if (error) redirect(`/events/${eventId}/register?registration=error`);
  revalidatePath("/dashboard");
  revalidatePath(`/events/${eventId}/register`);
  redirect(`/events/${eventId}/register?registration=success`);
}

export async function markAttendanceAction(formData: FormData): Promise<void> {
  const registrationId = formData.get("registrationId");
  const attendance = formData.get("attendance");
  if (typeof registrationId !== "string" || !uuidPattern.test(registrationId) || (attendance !== "attended" && attendance !== "absent")) redirect("/dashboard?attendance=invalid");
  const { supabase, userId } = await requireAttendanceManager();
  const { data, error } = await supabase.from("event_registrations").update({ attendance, attended_by: userId, attendance_marked_at: new Date().toISOString() }).eq("id", registrationId).eq("attendance", "pending").select("event_id").maybeSingle();
  if (error || !data) redirect("/dashboard?attendance=error");
  revalidatePath("/dashboard"); revalidatePath("/organizer"); revalidatePath("/faculty");
  redirect(`/dashboard?attendance=updated`);
}

async function requireAttendanceManager() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "organizer" && profile?.role !== "faculty_admin") redirect("/dashboard");
  if (profile.role === "organizer") {
    const { data: application } = await supabase.from("organizer_applications").select("status").eq("organizer_id", userId).maybeSingle();
    if (application?.status !== "approved") redirect("/organizer/access");
  }
  return { supabase, userId };
}
