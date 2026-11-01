import { describe, expect, it } from "vitest";
import { validateNewOrganizerInput, validateDeactivationReason } from "./organizer-management";

describe("validateNewOrganizerInput", () => {
  it("accepts valid input and defaults to approved initialStatus", () => {
    const formData = new FormData();
    formData.append("displayName", "Jane Doe");
    formData.append("email", "jane.doe@university.edu");
    formData.append("password", "SecurePassword123!");

    const result = validateNewOrganizerInput(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Jane Doe");
      expect(result.data.email).toBe("jane.doe@university.edu");
      expect(result.data.initialStatus).toBe("approved");
    }
  });

  it("accepts pending initialStatus when specified", () => {
    const formData = new FormData();
    formData.append("displayName", "Bob Smith");
    formData.append("email", "bob@campus.edu");
    formData.append("password", "Passcode99!");
    formData.append("initialStatus", "pending");

    const result = validateNewOrganizerInput(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.initialStatus).toBe("pending");
    }
  });

  it("rejects invalid display names", () => {
    const formData = new FormData();
    formData.append("displayName", "   ");
    formData.append("email", "test@campus.edu");
    formData.append("password", "ValidPass1!");

    const result = validateNewOrganizerInput(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("invalid-name");
    }
  });

  it("rejects invalid email addresses", () => {
    const formData = new FormData();
    formData.append("displayName", "Test User");
    formData.append("email", "not-an-email");
    formData.append("password", "ValidPass1!");

    const result = validateNewOrganizerInput(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("invalid-email");
    }
  });

  it("rejects passwords shorter than 8 characters", () => {
    const formData = new FormData();
    formData.append("displayName", "Test User");
    formData.append("email", "test@campus.edu");
    formData.append("password", "short");

    const result = validateNewOrganizerInput(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("invalid-password");
    }
  });
});

describe("validateDeactivationReason", () => {
  it("accepts a clean reason string", () => {
    const result = validateDeactivationReason("Violated event submission guidelines.");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reason).toBe("Violated event submission guidelines.");
    }
  });

  it("rejects empty or whitespace-only reason", () => {
    const result = validateDeactivationReason("   ");
    expect(result.success).toBe(false);
  });

  it("rejects reason longer than 2000 characters", () => {
    const result = validateDeactivationReason("a".repeat(2001));
    expect(result.success).toBe(false);
  });
});

