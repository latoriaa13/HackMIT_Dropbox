import { describe, expect, it } from "vitest";
import { defaultPlanningWeekStartIso, mondayOfWeek } from "./week-utils";

describe("defaultPlanningWeekStartIso", () => {
  it("uses next Monday on Saturday", () => {
    const sat = new Date("2026-09-19T15:00:00");
    expect(defaultPlanningWeekStartIso(sat)).toBe("2026-09-21");
  });

  it("uses next Monday on Sunday", () => {
    const sun = new Date("2026-09-20T10:00:00");
    expect(defaultPlanningWeekStartIso(sun)).toBe("2026-09-21");
  });

  it("uses current week Monday on Wednesday", () => {
    const wed = new Date("2026-09-16T10:00:00");
    expect(defaultPlanningWeekStartIso(wed)).toBe("2026-09-14");
    expect(defaultPlanningWeekStartIso(wed)).toBe(
      mondayOfWeek(wed).toISOString().slice(0, 10)
    );
  });
});
