import { NextResponse } from "next/server";
import {
  CalendarWeekQuerySchema,
  getMicrosoftAccount,
  calendarEventsToBusyBlocks,
  fetchAndCacheCalendarWeek,
  getCachedCalendarWeek,
  getBestCalendarWeekFallback,
  alignCalendarEventsToWeek,
  applyDemoOutlookWallTimes,
  requireMicrosoft365Provider,
  Microsoft365NotConnectedError,
} from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";
import { assertCalendarAccess } from "@/lib/tuesday-schedule";
import {
  defaultPlanningWeekStartIso,
  DEFAULT_SCHEDULING_PREFERENCES,
  parseWeekStartInZone,
  weekRangeFromStartInZone,
} from "@tuesday/core";

function presentOutlookCache<T extends { weekStart: string; timezone: string; events: unknown[] }>(
  cache: T,
  timezone?: string
): T {
  const tz = timezone ?? cache.timezone ?? DEFAULT_SCHEDULING_PREFERENCES.timezone;
  const events = applyDemoOutlookWallTimes(
    cache.events as Parameters<typeof applyDemoOutlookWallTimes>[0],
    cache.weekStart,
    tz
  );
  return { ...cache, timezone: tz, events } as T;
}

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    const url = new URL(request.url);
    const weekStartParam = url.searchParams.get("weekStart") ?? defaultPlanningWeekStartIso();
    const parsed = CalendarWeekQuerySchema.parse({
      weekStart: weekStartParam,
      timezone: url.searchParams.get("timezone") ?? undefined,
    });
    const account = getMicrosoftAccount(userId);
    if (!account) {
      throw new Microsoft365NotConnectedError();
    }
    assertCalendarAccess(userId);

    const sync = url.searchParams.get("sync") === "1";
    let cache = getCachedCalendarWeek(userId);
    const needsLiveFetch =
      sync || !cache || (parsed.weekStart && cache.weekStart !== parsed.weekStart);

    if (needsLiveFetch) {
      try {
        const provider = requireMicrosoft365Provider(userId);
        cache = await fetchAndCacheCalendarWeek(userId, provider, {
          weekStart: parsed.weekStart,
          timezone: parsed.timezone,
        });
      } catch (liveErr) {
        const source = getCachedCalendarWeek(userId) ?? getBestCalendarWeekFallback(userId);
        if (source?.events?.length) {
          const tz =
            parsed.timezone ?? source.timezone ?? DEFAULT_SCHEDULING_PREFERENCES.timezone;
          const monday = parseWeekStartInZone(parsed.weekStart, tz);
          const { weekStart, weekEnd } = weekRangeFromStartInZone(
            monday,
            DEFAULT_SCHEDULING_PREFERENCES.workDays
          );
          let events =
            source.weekStart === weekStart
              ? source.events
              : alignCalendarEventsToWeek(source.events, source.weekStart, weekStart, tz);
          events = applyDemoOutlookWallTimes(events, weekStart, tz);
          const cache = { ...source, timezone: tz, weekStart, weekEnd, events };
          return NextResponse.json({
            connected: true,
            email: account.email,
            cache,
            outlookEvents: calendarEventsToBusyBlocks(events),
          });
        }
        throw liveErr;
      }
    }

    const presented = cache ? presentOutlookCache(cache, parsed.timezone) : null;
    return NextResponse.json({
      connected: true,
      email: account.email,
      cache: presented,
      outlookEvents: presented ? calendarEventsToBusyBlocks(presented.events) : [],
    });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
