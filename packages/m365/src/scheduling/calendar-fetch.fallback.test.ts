import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";
import { fetchAndCacheCalendarWeek } from "./calendar-fetch";
import { M365AuthError } from "../auth/errors";
import type { Microsoft365Provider } from "../provider/interface";

describe("fetchAndCacheCalendarWeek fallback cache", () => {
  let tmpRoot: string;
  const prevDataDir = process.env.TUESDAY_DATA_DIR;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tuesday-cal-"));
    process.env.TUESDAY_DATA_DIR = tmpRoot;
    const automation = path.join(tmpRoot, "automation");
    fs.mkdirSync(automation, { recursive: true });
    fs.writeFileSync(
      path.join(automation, "calendar-cache.json"),
      JSON.stringify(
        {
          "source-session": {
            syncedAt: "2026-09-20T01:00:00.000Z",
            timezone: "America/New_York",
            weekStart: "2026-09-14",
            weekEnd: "2026-09-18",
            events: [
              {
                id: "ev1",
                subject: "Appointment",
                start: "2026-09-15T14:00:00.0000000",
                end: "2026-09-15T15:30:00.0000000",
                timezone: "America/New_York",
                location: "",
                isAllDay: false,
                showAs: "busy",
                sensitivity: "normal",
                isPrivate: false,
              },
            ],
          },
        },
        null,
        2
      )
    );
  });

  afterEach(() => {
    if (prevDataDir === undefined) delete process.env.TUESDAY_DATA_DIR;
    else process.env.TUESDAY_DATA_DIR = prevDataDir;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("shifts saved meetings to the requested planning week when Graph fails", async () => {
    const provider = {
      listUpcomingEvents: vi.fn(async () => {
        throw new M365AuthError("Calendar rejected", "graph_error");
      }),
    } as unknown as Microsoft365Provider;

    const result = await fetchAndCacheCalendarWeek("new-session", provider, {
      weekStart: "2026-09-21",
      timezone: "America/New_York",
    });

    expect(result.usedFallbackCache).toBe(true);
    expect(result.weekStart).toBe("2026-09-21");
    expect(result.events).toHaveLength(1);
    const local = DateTime.fromISO(result.events[0].start, { zone: "utc" }).setZone(
      "America/New_York"
    );
    expect(local.toISODate()).toBe("2026-09-22");
    expect(local.hour).toBe(9);
  });
});
