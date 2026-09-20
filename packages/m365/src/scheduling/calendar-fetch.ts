import {
  buildCalendarAwareSchedule,
  detectScheduleConflictsAfterRefresh,
  parseWeekStartInZone,
  weekRangeFromStartInZone,
  type OutlookBusyBlock,
  DEFAULT_SCHEDULING_PREFERENCES,
  wallClockInZoneToUtcIso,
  daysBetweenWeekStartsInZone,
  shiftUtcIsoByWallDaysInZone,
} from "@tuesday/core";
import type { Microsoft365Provider } from "../provider/interface";
import type { CalendarEvent } from "../schemas/m365-schemas";
import {
  getBestCalendarWeekFallback,
  getCalendarWeekCache,
  saveCalendarWeekCache,
} from "../storage/calendar-cache";
import { getOutlookTimeZoneContext, syncOutlookTimeZoneOnAccount } from "../calendar/outlook-timezone";
import { getMicrosoftAccount } from "../auth/account-store";
import { isM365AuthError } from "../auth/errors";
import {
  Microsoft365CalendarSyncError,
  Microsoft365NotConnectedError,
  Microsoft365PermissionError,
} from "../http/api-errors";
import { M365_SCOPES_CALENDAR } from "../auth/scopes";
import { messageFromAuthError } from "../auth/user-connection-messages";
import { applyDemoOutlookWallTimes } from "./demo-outlook-times";

function isUtcIso(iso: string): boolean {
  return /Z$|[+-]\d{2}:\d{2}$/.test(iso);
}

/** Older cache rows stored Graph wall times without UTC normalization. */
export function normalizeStoredCalendarEvent(ev: CalendarEvent): CalendarEvent {
  const tz = ev.timezone || DEFAULT_SCHEDULING_PREFERENCES.timezone;
  if (isUtcIso(ev.start) && isUtcIso(ev.end)) return ev;
  return {
    ...ev,
    start: isUtcIso(ev.start) ? ev.start : wallClockInZoneToUtcIso(ev.start, tz),
    end: isUtcIso(ev.end) ? ev.end : wallClockInZoneToUtcIso(ev.end, tz),
  };
}

export function normalizeStoredCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.map(normalizeStoredCalendarEvent);
}

function shiftEventsToWeek(
  events: CalendarEvent[],
  fromWeekStart: string,
  toWeekStart: string,
  timezone: string
): CalendarEvent[] {
  if (fromWeekStart === toWeekStart) return events;
  const delta = daysBetweenWeekStartsInZone(fromWeekStart, toWeekStart, timezone);
  if (!delta) return events;
  return events.map((ev) => {
    const eventZone = ev.timezone?.includes("/") ? ev.timezone : timezone;
    return {
      ...ev,
      timezone: eventZone,
      start: shiftUtcIsoByWallDaysInZone(ev.start, delta, eventZone),
      end: shiftUtcIsoByWallDaysInZone(ev.end, delta, eventZone),
    };
  });
}

/** Shift normalized cached Outlook rows onto another planning week (Outlook wall times preserved). */
export function alignCalendarEventsToWeek(
  events: CalendarEvent[],
  fromWeekStart: string,
  toWeekStart: string,
  timezone: string
): CalendarEvent[] {
  return shiftEventsToWeek(normalizeStoredCalendarEvents(events), fromWeekStart, toWeekStart, timezone);
}

function loadFallbackCalendarWeek(
  userId: string,
  weekStart: string,
  weekEnd: string,
  timezone: string
) {
  const source = getBestCalendarWeekFallback(userId);
  if (!source?.events?.length) return null;
  const shiftZone = timezone || source.timezone || DEFAULT_SCHEDULING_PREFERENCES.timezone;
  const normalized = normalizeStoredCalendarEvents(source.events);
  let events = shiftEventsToWeek(normalized, source.weekStart, weekStart, shiftZone);
  events = applyDemoOutlookWallTimes(events, weekStart, timezone);
  const syncedAt = new Date().toISOString();
  const payload = { syncedAt, timezone, weekStart, weekEnd, events };
  saveCalendarWeekCache(userId, payload);
  return { ...payload, eventCount: events.length, usedFallbackCache: true as const };
}

export function calendarEventsToBusyBlocks(events: CalendarEvent[]): OutlookBusyBlock[] {
  return normalizeStoredCalendarEvents(events).map((ev) => ({
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
  await syncOutlookTimeZoneOnAccount(userId);
  const { windows, iana } = await getOutlookTimeZoneContext(userId, options?.timezone);
  const timezone = iana;
  const weekStartMonday = parseWeekStartInZone(options?.weekStart, timezone);
  const { weekStart, weekEnd } = weekRangeFromStartInZone(
    weekStartMonday,
    DEFAULT_SCHEDULING_PREFERENCES.workDays
  );
  const startIso = `${weekStart}T00:00:00`;
  const endIso = `${weekEnd}T23:59:59`;
  const skipLiveGraph =
    process.env.TUESDAY_DEMO_OUTLOOK === "1" || process.env.TUESDAY_DEMO_OUTLOOK === "true";

  let raw: CalendarEvent[] = [];
  if (!skipLiveGraph) {
    try {
      raw = await provider.listUpcomingEvents({
        start: startIso,
        end: endIso,
        timezone,
        outlookTimeZone: windows,
      });
    } catch (e) {
      const fallback = loadFallbackCalendarWeek(userId, weekStart, weekEnd, timezone);
      if (fallback) {
        return fallback;
      }
      if (isM365AuthError(e)) {
        if (e.code === "reauth_required") {
          throw new Microsoft365NotConnectedError(messageFromAuthError(e, "calendar"));
        }
        if (e.code === "insufficient_scope" || e.code === "consent_required") {
          throw new Microsoft365PermissionError(messageFromAuthError(e, "calendar"), [
            ...M365_SCOPES_CALENDAR,
          ]);
        }
        if (e.code === "graph_error") {
          throw new Microsoft365NotConnectedError(messageFromAuthError(e, "calendar"));
        }
        throw new Microsoft365CalendarSyncError(messageFromAuthError(e, "calendar"));
      }
      throw e;
    }
  } else {
    const fallback = loadFallbackCalendarWeek(userId, weekStart, weekEnd, timezone);
    if (fallback) return fallback;
    throw new Microsoft365CalendarSyncError(
      "Live Outlook sync is disabled and no saved meetings were found. Connect Outlook or remove TUESDAY_DEMO_OUTLOOK."
    );
  }
  if (!raw.length) {
    const fallback = loadFallbackCalendarWeek(userId, weekStart, weekEnd, timezone);
    if (fallback) return fallback;
  }

  const events = normalizeStoredCalendarEvents(raw);
  const syncedAt = new Date().toISOString();
  saveCalendarWeekCache(userId, {
    syncedAt,
    timezone,
    weekStart,
    weekEnd,
    events,
  });
  return { syncedAt, timezone, weekStart, weekEnd, events, eventCount: events.length };
}

export function getCachedCalendarWeek(userId: string) {
  return getCalendarWeekCache(userId);
}

export { buildCalendarAwareSchedule, detectScheduleConflictsAfterRefresh };
