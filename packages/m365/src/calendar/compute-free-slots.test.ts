import { describe, it, expect } from "vitest";
import { computeFreeSlots } from "./compute-free-slots";

describe("computeFreeSlots", () => {
  it("excludes busy calendar events", () => {
    const input = {
      start: "2026-09-22T00:00:00.000Z",
      end: "2026-09-23T00:00:00.000Z",
      durationMinutes: 30,
      timezone: "America/New_York",
      workingHoursStart: 9,
      workingHoursEnd: 17,
    };
    const busy = [
      {
        id: "1",
        subject: "Busy",
        start: "2026-09-22T14:00:00.000Z",
        end: "2026-09-22T15:00:00.000Z",
        timezone: "America/New_York",
      },
    ];
    const withoutBusy = computeFreeSlots(input, []);
    const withBusy = computeFreeSlots(input, busy);
    expect(withBusy.length).toBeLessThanOrEqual(withoutBusy.length);
    for (const slot of withBusy) {
      const s = new Date(slot.start).getTime();
      const e = new Date(slot.end).getTime();
      const bs = new Date(busy[0]!.start).getTime();
      const be = new Date(busy[0]!.end).getTime();
      expect(s >= be || e <= bs).toBe(true);
    }
  });
});
