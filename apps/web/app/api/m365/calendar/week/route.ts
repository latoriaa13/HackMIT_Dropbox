import { NextResponse } from "next/server";
import {
  CalendarWeekQuerySchema,
  getMicrosoftAccount,
  calendarEventsToBusyBlocks,
  fetchAndCacheCalendarWeek,
  getCachedCalendarWeek,
  requireMicrosoft365Provider,
  Microsoft365NotConnectedError,
} from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";
import { assertCalendarAccess } from "@/lib/tuesday-schedule";

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    const url = new URL(request.url);
    const parsed = CalendarWeekQuerySchema.parse({
      weekStart: url.searchParams.get("weekStart") ?? undefined,
      timezone: url.searchParams.get("timezone") ?? undefined,
    });
    const account = getMicrosoftAccount(userId);
    if (!account) {
      throw new Microsoft365NotConnectedError();
    }
    assertCalendarAccess(userId);

    const sync = url.searchParams.get("sync") === "1";
    let cache = getCachedCalendarWeek(userId);
    if (sync || !cache || (parsed.weekStart && cache.weekStart !== parsed.weekStart)) {
      const provider = requireMicrosoft365Provider(userId);
      cache = await fetchAndCacheCalendarWeek(userId, provider, {
        weekStart: parsed.weekStart,
        timezone: parsed.timezone,
      });
    }

    return NextResponse.json({
      connected: true,
      email: account.email,
      cache,
      outlookEvents: cache ? calendarEventsToBusyBlocks(cache.events) : [],
    });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
