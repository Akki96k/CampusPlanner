export type NewOrganizerInput = {
  displayName: string;
  email: string;
  password: string;
  initialStatus: "approved" | "pending";
};

export type NewOrganizerValidationResult =
  | { success: true; data: NewOrganizerInput }
  | { success: false; error: "invalid-name" | "invalid-email" | "invalid-password" | "invalid-status" };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNewOrganizerInput(formData: FormData): NewOrganizerValidationResult {
  const rawDisplayName = formData.get("displayName");
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const rawStatus = formData.get("initialStatus");

  if (typeof rawDisplayName !== "string") {
    return { success: false, error: "invalid-name" };
  }
  const displayName = rawDisplayName.trim().replace(/\s+/g, " ");
  if (!displayName || displayName.length > 100 || /[\u0000-\u001f\u007f]/.test(displayName)) {
    return { success: false, error: "invalid-name" };
  }

  if (typeof rawEmail !== "string") {
    return { success: false, error: "invalid-email" };
  }
  const email = rawEmail.trim().toLowerCase();
  if (!email || email.length > 254 || !emailPattern.test(email)) {
    return { success: false, error: "invalid-email" };
  }

  if (typeof rawPassword !== "string") {
    return { success: false, error: "invalid-password" };
  }
  if (rawPassword.length < 8 || rawPassword.length > 128) {
    return { success: false, error: "invalid-password" };
  }

  let initialStatus: "approved" | "pending" = "approved";
  if (rawStatus !== null && rawStatus !== undefined) {
    if (rawStatus !== "approved" && rawStatus !== "pending") {
      return { success: false, error: "invalid-status" };
    }
    initialStatus = rawStatus as "approved" | "pending";
  }

  return {
    success: true,
    data: {
      displayName,
      email,
      password: rawPassword,
      initialStatus,
    },
  };
}

export function validateDeactivationReason(reason: unknown): { success: true; reason: string } | { success: false; error: string } {
  if (typeof reason !== "string") {
    return { success: false, error: "Reason must be text." };
  }
  const clean = reason.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > 2000) {
    return { success: false, error: "A reason between 1 and 2,000 characters is required." };
  }
  return { success: true, reason: clean };
}

