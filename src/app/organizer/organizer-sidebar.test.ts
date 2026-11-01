import { describe, expect, it } from "vitest";
import { ORGANIZER_NAV_ITEMS, isOrganizerNavActive } from "./organizer-sidebar";

describe("OrganizerSidebar navigation", () => {
  it("contains all required navigation options in the exact order with correct links", () => {
    expect(ORGANIZER_NAV_ITEMS).toHaveLength(2);
    expect(ORGANIZER_NAV_ITEMS[0]).toMatchObject({ label: "Browse Events", href: "/dashboard" });
    expect(ORGANIZER_NAV_ITEMS[1]).toMatchObject({ label: "Organizer Tools", href: "/organizer" });
  });

  it("accurately detects active route for Organizer Tools including nested routes", () => {
    expect(isOrganizerNavActive("/organizer", "/organizer")).toBe(true);
    expect(isOrganizerNavActive("/organizer", "/organizer/access")).toBe(true);
    expect(isOrganizerNavActive("/organizer", "/organizer/events/create")).toBe(true);
    expect(isOrganizerNavActive("/organizer", "/dashboard")).toBe(false);
    expect(isOrganizerNavActive("/organizer", "/faculty")).toBe(false);
  });

  it("accurately detects active route for Browse Events", () => {
    expect(isOrganizerNavActive("/dashboard", "/dashboard")).toBe(true);
    expect(isOrganizerNavActive("/dashboard", "/dashboard/events/123")).toBe(true);
    expect(isOrganizerNavActive("/dashboard", "/organizer")).toBe(false);
    expect(isOrganizerNavActive("/dashboard", "/faculty")).toBe(false);
  });
});

