import { describe, it, expect } from "vitest";
import { buildWeeklyCalendar } from "./weekly-calendar";
import type { QueueItem } from "../models/types";

function mockItem(id: string, minutes: number): QueueItem {
  return {
    constituentId: id,
    constituentName: `Person ${id}`,
    recommendedAction: "renewal_ask",
    channel: "phone",
    estimatedMinutes: minutes,
    conservativeOpportunity: 100,
    expectedOpportunity: 100,
    upsideOpportunity: 120,
    priorityScore: 10,
    confidence: 0.8,
    whyNow: "LYBUNT",
    evidence: [],
    suggestedMessage: "Renew",
    warning: null,
  };
}

describe("buildWeeklyCalendar", () => {
  it("schedules steps across weekdays with times", () => {
    const cal = buildWeeklyCalendar(
      [mockItem("1", 20), mockItem("2", 20), mockItem("3", 20)],
      8,
      { referenceDate: "2026-09-01" }
    );
    expect(cal.steps.length).toBeGreaterThan(3);
    expect(cal.days.length).toBeGreaterThan(0);
    const actionSteps = cal.steps.filter((s) => s.kind === "constituent_action");
    expect(actionSteps.every((s) => s.startTime && s.endTime)).toBe(true);
  });
});
