import { describe, expect, it } from "vitest";
import {
  daysBetweenWeekStartsInZone,
  shiftUtcIsoByWallDaysInZone,
  wallClockInZoneToUtcIso,
} from "./timezone";
import { DateTime } from "luxon";

describe("timezone week shift", () => {
  it("counts days between week starts in zone", () => {
    expect(daysBetweenWeekStartsInZone("2026-09-14", "2026-09-21", "America/New_York")).toBe(7);
  });

  it("preserves wall clock when shifting by days in zone", () => {
    const utc = wallClockInZoneToUtcIso("2026-09-15T14:00:00", "America/New_York");
    const shifted = shiftUtcIsoByWallDaysInZone(utc, 7, "America/New_York");
    const local = DateTime.fromISO(shifted, { zone: "utc" }).setZone("America/New_York");
    expect(local.toISODate()).toBe("2026-09-22");
    expect(local.hour).toBe(14);
    expect(local.minute).toBe(0);
  });
});
