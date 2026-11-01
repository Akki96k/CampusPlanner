import { describe, expect, it } from "vitest";
import { validateOrganizerProfileUpdate } from "./organizer-profile";

describe("validateOrganizerProfileUpdate", () => {
  const validId = "70000000-0000-4000-8000-000000000001";

  it("accepts a valid display name and trims excess whitespace", () => {
    const formData = new FormData();
    formData.set("organizerId", validId);
    formData.set("displayName", "  Dr. Jane   Smith  ");

    const result = validateOrganizerProfileUpdate(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizerId).toBe(validId);
      expect(result.data.displayName).toBe("Dr. Jane Smith");
    }
  });

  it("rejects invalid or missing organizer UUIDs", () => {
    const formData = new FormData();
    formData.set("organizerId", "not-a-valid-uuid");
    formData.set("displayName", "Valid Name");

    const result = validateOrganizerProfileUpdate(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("invalid-id");
    }
  });

  it("rejects empty or whitespace-only display names", () => {
    const formData = new FormData();
    formData.set("organizerId", validId);
    formData.set("displayName", "     ");

    const result = validateOrganizerProfileUpdate(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("invalid-name");
    }
  });

  it("rejects display names exceeding 100 characters", () => {
    const formData = new FormData();
    formData.set("organizerId", validId);
    formData.set("displayName", "A".repeat(101));

    const result = validateOrganizerProfileUpdate(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("invalid-name");
    }
  });

  it("strictly prevents altering approval status through profile editing", () => {
    const formData = new FormData();
    formData.set("organizerId", validId);
    formData.set("displayName", "Dr. Jane Smith");
    formData.set("status", "approved");

    const result = validateOrganizerProfileUpdate(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("unauthorized-status-change");
    }
  });

  it("strictly prevents altering user role through profile editing", () => {
    const formData = new FormData();
    formData.set("organizerId", validId);
    formData.set("displayName", "Dr. Jane Smith");
    formData.set("role", "faculty_admin");

    const result = validateOrganizerProfileUpdate(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("unauthorized-status-change");
    }
  });
});

