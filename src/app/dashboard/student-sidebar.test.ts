import { describe, expect, it } from "vitest";
import { STUDENT_DASHBOARD_TITLE, formatStudentDisplayEmail } from "./student-sidebar";

describe("StudentSidebar", () => {
  it("uses the exact required Student Dashboard title", () => {
    expect(STUDENT_DASHBOARD_TITLE).toBe("Student Dashboard");
  });

  it("dynamically formats and trims user email for display", () => {
    expect(formatStudentDisplayEmail("akshaypawar3630@gmail.com")).toBe("akshaypawar3630@gmail.com");
    expect(formatStudentDisplayEmail("  student@university.edu  ")).toBe("student@university.edu");
  });

  it("handles fallback if email is unexpectedly empty", () => {
    expect(formatStudentDisplayEmail("")).toBe("Signed-in student");
  });
});

