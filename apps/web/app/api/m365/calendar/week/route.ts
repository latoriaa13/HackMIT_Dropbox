import { NextResponse } from "next/server";
import { CalendarWeekQuerySchema, getMicrosoftAccount, hasCalendarScopes } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";
import { getCachedCalendarWeek } from "@/lib/tuesday-schedule";
import { Microsoft365NotConnectedError, Microsoft365PermissionError } from "@tuesday/m365";

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    const url = new URL(request.url);
    CalendarWeekQuerySchema.parse({
      weekStart: url.searchParams.get("weekStart") ?? undefined,
      timezone: url.searchParams.get("timezone") ?? undefined,
    });
    const account = getMicrosoftAccount(userId);
    if (!account) {
      throw new Microsoft365NotConnectedError();
    }
    if (!hasCalendarScopes(account.grantedScopes)) {
      throw new Microsoft365PermissionError("Calendar read permission required.", ["Calendars.Read"]);
    }
    const cache = getCachedCalendarWeek(userId);
    return NextResponse.json({
      connected: true,
      email: account.email,
      cache,
    });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
