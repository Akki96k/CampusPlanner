export type OrganizerProfileInput = {
  organizerId: string;
  displayName: string;
};

export type OrganizerProfileValidationResult =
  | { success: true; data: OrganizerProfileInput }
  | { success: false; error: "invalid-id" | "invalid-name" | "unauthorized-status-change" };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateOrganizerProfileUpdate(
  formData: FormData,
): OrganizerProfileValidationResult {
  const organizerId = formData.get("organizerId");
  const rawDisplayName = formData.get("displayName");
  const attemptedStatus = formData.get("status");
  const attemptedRole = formData.get("role");

  // Prevent profile editing from changing approval status or role
  if (attemptedStatus !== null || attemptedRole !== null) {
    return { success: false, error: "unauthorized-status-change" };
  }

  if (typeof organizerId !== "string" || !uuidPattern.test(organizerId)) {
    return { success: false, error: "invalid-id" };
  }

  if (typeof rawDisplayName !== "string") {
    return { success: false, error: "invalid-name" };
  }

  const displayName = rawDisplayName.trim().replace(/\s+/g, " ");
  if (!displayName || displayName.length > 100) {
    return { success: false, error: "invalid-name" };
  }

  return { success: true, data: { organizerId, displayName } };
}

