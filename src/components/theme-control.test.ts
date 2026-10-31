import { describe, expect, it } from "vitest";
import { resolveTheme } from "./theme-control";

describe("theme choice", () => {
  it("resolves explicit light and dark preferences", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("follows the device preference in system mode", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
