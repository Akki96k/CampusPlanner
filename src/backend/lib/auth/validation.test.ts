import { describe, expect, it } from "vitest";
import { passwordsMatch, validateAuthCredentials } from "@/backend/lib/auth/validation";

describe("validateAuthCredentials", () => {
  it("normalizes email casing and surrounding spaces", () => {
    expect(validateAuthCredentials("  STUDENT@COLLEGE.EDU  ", "password123")).toEqual({
      success: true,
      credentials: { email: "student@college.edu", password: "password123" },
    });
  });

  it("rejects an invalid email", () => {
    expect(validateAuthCredentials("not-an-email", "password123")).toEqual({
      success: false,
      message: "Enter a valid email address.",
    });
  });

  it("rejects non-string form values", () => {
    expect(validateAuthCredentials(new File(["data"], "email.txt"), "password123"))
      .toEqual({ success: false, message: "Enter your email and password." });
  });

  it("enforces the password length bounds", () => {
    expect(validateAuthCredentials("student@college.edu", "short").success).toBe(false);
    expect(
      validateAuthCredentials("student@college.edu", "p".repeat(129)).success,
    ).toBe(false);
  });
});

describe("passwordsMatch", () => {
  it("accepts matching confirmation values", () => {
    expect(passwordsMatch("password123", "password123")).toBe(true);
  });

  it("rejects missing or mismatched confirmation values", () => {
    expect(passwordsMatch("password123", "different123")).toBe(false);
    expect(passwordsMatch("password123", null)).toBe(false);
  });
});
