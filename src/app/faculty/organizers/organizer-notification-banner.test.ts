import { describe, expect, it } from "vitest";
import { buildUrlWithoutResult } from "./organizer-notification-banner";

describe("buildUrlWithoutResult", () => {
  it("clears result parameter when it is the only query param", () => {
    const url = buildUrlWithoutResult("/faculty/organizers", "result=profile-updated");
    expect(url).toBe("/faculty/organizers");
  });

  it("removes result parameter while preserving other query parameters", () => {
    const url = buildUrlWithoutResult("/faculty/organizers", "filter=approved&result=profile-updated&page=2");
    expect(url).toBe("/faculty/organizers?filter=approved&page=2");
  });

  it("returns clean pathname when searchParams is empty", () => {
    const url = buildUrlWithoutResult("/faculty/organizers", "");
    expect(url).toBe("/faculty/organizers");
  });

  it("leaves other unrelated query params intact if result is not present", () => {
    const url = buildUrlWithoutResult("/faculty/organizers", "status=pending");
    expect(url).toBe("/faculty/organizers?status=pending");
  });
});

