import { DateTime } from "luxon";

/** IANA zone used for scheduling math and display (e.g. America/Chicago). */
export function assertIanaZone(zone: string): string {
  if (DateTime.now().setZone(zone).isValid) return zone;
  return "America/New_York";
}

/** Strip Graph fractional seconds and parse wall time in `zone`, return UTC ISO. */
export function wallClockInZoneToUtcIso(dateTime: string, zone: string): string {
  const iana = assertIanaZone(zone);
  const cleaned = dateTime.replace(/\.\d+/, "").replace(/Z$/, "");
  const dt = DateTime.fromISO(cleaned, { zone: iana });
  if (!dt.isValid) {
    return DateTime.fromISO(dateTime, { zone: "utc" }).toUTC().toISO() ?? new Date(dateTime).toISOString();
  }
  return dt.toUTC().toISO() ?? new Date(dateTime).toISOString();
}

export function utcIsoToDateKey(utcIso: string, zone: string): string {
  const iana = assertIanaZone(zone);
  const dt = DateTime.fromISO(utcIso, { zone: "utc" }).setZone(iana);
  return dt.toISODate() ?? utcIso.slice(0, 10);
}

export function hourInZone(utcMs: number, zone: string): number {
  return DateTime.fromMillis(utcMs, { zone: "utc" }).setZone(assertIanaZone(zone)).hour;
}

export function mondayOfWeekInZone(reference: DateTime): DateTime {
  const weekday = reference.weekday; // 1=Mon .. 7=Sun
  return reference.startOf("day").minus({ days: weekday - 1 });
}

/** On weekend days, the next calendar Monday; otherwise Monday of the current week (in `zone`). */
export function planningWeekMondayInZone(reference: DateTime): DateTime {
  const weekday = reference.weekday;
  if (weekday === 6) return reference.startOf("day").plus({ days: 2 });
  if (weekday === 7) return reference.startOf("day").plus({ days: 1 });
  return mondayOfWeekInZone(reference);
}

export function parseWeekStartInZone(weekStart: string | undefined, zone: string): DateTime {
  const iana = assertIanaZone(zone);
  if (weekStart) {
    const ref = DateTime.fromISO(weekStart, { zone: iana }).startOf("day").plus({ hours: 12 });
    return mondayOfWeekInZone(ref);
  }
  return planningWeekMondayInZone(DateTime.now().setZone(iana));
}

export function weekRangeFromStartInZone(
  weekStartMonday: DateTime,
  workDays: number
): { weekStart: string; weekEnd: string } {
  const startKey = weekStartMonday.toISODate()!;
  const endKey = weekStartMonday.plus({ days: workDays - 1 }).toISODate()!;
  return { weekStart: startKey, weekEnd: endKey };
}

export function dayKeysInZone(weekStart: string, workDays: number, zone: string): string[] {
  const iana = assertIanaZone(zone);
  let d = DateTime.fromISO(weekStart, { zone: iana }).startOf("day");
  const keys: string[] = [];
  for (let i = 0; i < workDays; i++) {
    keys.push(d.toISODate()!);
    d = d.plus({ days: 1 });
  }
  return keys;
}

export function formatTimeRangeInZone(startUtcIso: string, endUtcIso: string, zone: string): string {
  const iana = assertIanaZone(zone);
  const fmt: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: iana,
  };
  const s = new Date(startUtcIso).toLocaleTimeString("en-US", fmt);
  const e = new Date(endUtcIso).toLocaleTimeString("en-US", fmt);
  return `${s}–${e}`;
}

export function dayTitleInZone(dateKey: string, zone: string): string {
  const iana = assertIanaZone(zone);
  const d = DateTime.fromISO(dateKey, { zone: iana }).plus({ hours: 12 });
  return d.toLocaleString({ weekday: "long", month: "short", day: "numeric" }, { locale: "en-US" });
}

/** Calendar days between two week-start dates (YYYY-MM-DD), measured in `zone`. */
export function daysBetweenWeekStartsInZone(
  fromWeekStart: string,
  toWeekStart: string,
  zone: string
): number {
  const iana = assertIanaZone(zone);
  const from = DateTime.fromISO(fromWeekStart, { zone: iana }).startOf("day");
  const to = DateTime.fromISO(toWeekStart, { zone: iana }).startOf("day");
  return Math.round(to.diff(from, "days").days);
}

/** Move an instant by whole calendar days in `zone` (wall clock preserved, DST-safe). */
export function shiftUtcIsoByWallDaysInZone(utcIso: string, days: number, zone: string): string {
  if (!days) return utcIso;
  const iana = assertIanaZone(zone);
  const shifted = DateTime.fromISO(utcIso, { zone: "utc" }).setZone(iana).plus({ days: days });
  return shifted.toUTC().toISO() ?? utcIso;
}
