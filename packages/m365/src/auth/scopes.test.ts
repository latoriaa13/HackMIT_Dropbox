import { describe, it, expect } from "vitest";
import { mergeGrantedScopes, scopesForIncrementalConsent } from "./scopes";

describe("incremental Microsoft scopes", () => {
  it("merges calendar onto existing mail scopes", () => {
    const merged = scopesForIncrementalConsent("calendar", ["User.Read", "Mail.Read"]);
    expect(merged.some((s) => s.includes("Calendars.Read"))).toBe(true);
    expect(merged.some((s) => s.includes("Mail.Read"))).toBe(true);
  });

  it("mergeGrantedScopes unions without duplicates", () => {
    expect(mergeGrantedScopes(["User.Read"], ["User.Read", "Calendars.Read"])).toEqual([
      "User.Read",
      "Calendars.Read",
    ]);
  });
});
