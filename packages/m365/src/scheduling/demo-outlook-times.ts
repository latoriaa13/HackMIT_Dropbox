import {
  DEFAULT_SCHEDULING_PREFERENCES,
  assertIanaZone,
  dayKeysInZone,
  utcIsoToDateKey,
  wallClockInZoneToUtcIso,
} from "@tuesday/core";
import type { CalendarEvent } from "../schemas/m365-schemas";

/** Canonical demo wall times for saved Outlook fallback (week-relative). */
export function applyDemoOutlookWallTimes(
  events: CalendarEvent[],
  weekStart: string,
  timezone: string
): CalendarEvent[] {
  const zone = assertIanaZone(timezone);
  const days = dayKeysInZone(weekStart, DEFAULT_SCHEDULING_PREFERENCES.workDays, zone);
  const tuesday = days[1]!;
  const thursday = days[3]!;

  let appointmentIndex = 0;

  return events.map((ev) => {
    const subject = ev.subject?.trim() ?? "";
    if (/^lunch$/i.test(subject)) {
      const day = utcIsoToDateKey(ev.start, zone);
      return {
        ...ev,
        timezone: zone,
        start: wallClockInZoneToUtcIso(`${day}T12:00:00`, zone),
        end: wallClockInZoneToUtcIso(`${day}T13:00:00`, zone),
      };
    }
    if (/^appointment$/i.test(subject)) {
      const slot = appointmentIndex++;
      if (slot === 0) {
        return {
          ...ev,
          timezone: zone,
          start: wallClockInZoneToUtcIso(`${tuesday}T09:00:00`, zone),
          end: wallClockInZoneToUtcIso(`${tuesday}T10:10:00`, zone),
        };
      }
      return {
        ...ev,
        timezone: zone,
        start: wallClockInZoneToUtcIso(`${thursday}T16:00:00`, zone),
        end: wallClockInZoneToUtcIso(`${thursday}T17:00:00`, zone),
      };
    }
    return ev;
  });
}
