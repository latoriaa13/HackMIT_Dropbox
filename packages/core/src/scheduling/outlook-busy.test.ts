import { describe, it, expect } from "vitest";
import { isBlockingOutlookEvent } from "./outlook-busy";

describe("isBlockingOutlookEvent", () => {
  it("treats busy and default as blocking", () => {
    expect(isBlockingOutlookEvent({ id: "1", subject: "A", start: "", end: "", showAs: "busy" })).toBe(true);
    expect(isBlockingOutlookEvent({ id: "2", subject: "B", start: "", end: "" })).toBe(true);
  });

  it("does not block free events", () => {
    expect(isBlockingOutlookEvent({ id: "3", subject: "C", start: "", end: "", showAs: "free" })).toBe(false);
  });
});
