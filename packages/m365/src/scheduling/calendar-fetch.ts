import {
  buildCalendarAwareSchedule,
  detectScheduleConflictsAfterRefresh,
  parseWeekStart,
  weekRangeFromStart,
  type OutlookBusyBlock,
  DEFAULT_SCHEDULING_PREFERENCES,
} from "@tuesday/core";
import type { Microsoft365Provider } from "../provider/interface";
import type { CalendarEvent } from "../schemas/m365-schemas";
import { getCalendarWeekCache, saveCalendarWeekCache } from "../storage/calendar-cache";

export function calendarEventsToBusyBlocks(events: CalendarEvent[]): OutlookBusyBlock[] {
  return events.map((ev) => ({
    id: ev.id,
    subject: ev.subject,
    start: ev.start,
    end: ev.end,
    location: ev.location,
    isAllDay: ev.isAllDay,
    showAs: ev.showAs,
    isPrivate: ev.isPrivate,
  }));
}

export async function fetchAndCacheCalendarWeek(
  userId: string,
  provider: Microsoft365Provider,
  options?: { weekStart?: string; timezone?: string }
) {
  const timezone = options?.timezone ?? DEFAULT_SCHEDULING_PREFERENCES.timezone;
  const weekStartDate = parseWeekStart(options?.weekStart);
  const { weekStart, weekEnd } = weekRangeFromStart(
    weekStartDate,
    DEFAULT_SCHEDULING_PREFERENCES.workDays
  );
  const startIso = `${weekStart}T00:00:00`;
  const endIso = `${weekEnd}T23:59:59`;
  const events = await provider.listUpcomingEvents({
    start: startIso,
    end: endIso,
    timezone,
  });
  const syncedAt = new Date().toISOString();
  saveCalendarWeekCache(userId, {
    syncedAt,
    timezone,
    weekStart,
    weekEnd,
    events,
  });
  return { syncedAt, timezone, weekStart, weekEnd, events };
}

export function getCachedCalendarWeek(userId: string) {
  return getCalendarWeekCache(userId);
}

export { buildCalendarAwareSchedule, detectScheduleConflictsAfterRefresh };
