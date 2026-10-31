import { describe, expect, it } from "vitest";
import { validateRegistration } from "./registration-validation";

function form(values: Record<string, string>) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}

const valid = { fullName: "Ada Lovelace", email: "ADA@example.edu", phone: "+1 555 222 1212", collegeName: "Example University", studentNumber: "A-104", yearOrSemester: "Year 2", graduationYear: String(new Date().getFullYear() + 2), participationType: "team" };

describe("event registration validation", () => {
  it("normalizes valid values", () => {
    const result = validateRegistration(form(valid));
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.email).toBe("ada@example.edu");
  });

  it("rejects malformed email, phone, and participation values", () => {
    expect(validateRegistration(form({ ...valid, email: "bad" })).success).toBe(false);
    expect(validateRegistration(form({ ...valid, phone: "123" })).success).toBe(false);
    expect(validateRegistration(form({ ...valid, participationType: "group" })).success).toBe(false);
  });

  it("rejects an invalid graduation year", () => {
    expect(validateRegistration(form({ ...valid, graduationYear: "1999" })).success).toBe(false);
  });
});
