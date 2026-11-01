import { describe, expect, it } from "vitest";
import { FACULTY_NAV_ITEMS, isNavActive } from "./faculty-sidebar";

describe("FacultySidebar navigation", () => {
  it("contains all required navigation options with correct links", () => {
    expect(FACULTY_NAV_ITEMS).toHaveLength(3);
    expect(FACULTY_NAV_ITEMS[0]).toMatchObject({ label: "Browse events", href: "/dashboard" });
    expect(FACULTY_NAV_ITEMS[1]).toMatchObject({ label: "Approval queue", href: "/faculty" });
    expect(FACULTY_NAV_ITEMS[2]).toMatchObject({ label: "Manage organizers", href: "/faculty/organizers" });
  });

  it("accurately detects active route for Approval queue", () => {
    expect(isNavActive("/faculty", "/faculty")).toBe(true);
    expect(isNavActive("/faculty", "/faculty/organizers")).toBe(false);
    expect(isNavActive("/faculty", "/dashboard")).toBe(false);
  });

  it("accurately detects active route for Manage organizers", () => {
    expect(isNavActive("/faculty/organizers", "/faculty/organizers")).toBe(true);
    expect(isNavActive("/faculty/organizers", "/faculty")).toBe(false);
  });

  it("accurately detects active route for Browse events", () => {
    expect(isNavActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavActive("/dashboard", "/faculty")).toBe(false);
  });
});

