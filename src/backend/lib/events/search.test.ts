import { describe, expect, it } from "vitest";
import { escapeLikePattern, parseEventSearch } from "@/backend/lib/events/search";

describe("parseEventSearch", () => {
  it("trims a valid search string", () => {
    expect(parseEventSearch("  Robotics  ")).toBe("Robotics");
  });

  it("treats an absent query as an empty search", () => {
    expect(parseEventSearch(undefined)).toBe("");
  });

  it("rejects repeated and overlong query parameters", () => {
    expect(parseEventSearch(["one", "two"])).toBeNull();
    expect(parseEventSearch("x".repeat(81))).toBeNull();
  });
});

describe("escapeLikePattern", () => {
  it("treats SQL LIKE wildcard characters as literal search text", () => {
    expect(escapeLikePattern("100%_ready\\now")).toBe("100\\%\\_ready\\\\now");
  });
});
