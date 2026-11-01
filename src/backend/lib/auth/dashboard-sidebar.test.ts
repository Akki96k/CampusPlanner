import { describe, expect, it } from "vitest";
import { resolveDashboardSidebarKind } from "./dashboard-sidebar";

describe("resolveDashboardSidebarKind", () => {
  it("resolves student role to student sidebar", () => {
    expect(resolveDashboardSidebarKind("student")).toBe("student");
  });

  it("resolves organizer role to organizer sidebar regardless of approval status", () => {
    expect(resolveDashboardSidebarKind("organizer")).toBe("organizer");
  });

  it("resolves faculty_admin role to faculty sidebar", () => {
    expect(resolveDashboardSidebarKind("faculty_admin")).toBe("faculty");
  });

  it("falls back to student sidebar for null, undefined, or unrecognized role", () => {
    expect(resolveDashboardSidebarKind(null)).toBe("student");
    expect(resolveDashboardSidebarKind(undefined)).toBe("student");
    expect(resolveDashboardSidebarKind("guest")).toBe("student");
  });
});

