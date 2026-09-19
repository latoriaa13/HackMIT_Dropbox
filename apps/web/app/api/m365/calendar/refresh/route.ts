import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";
import { refreshCalendarAndSchedule } from "@/lib/tuesday-schedule";

export async function POST() {
  try {
    const userId = await getSessionUserId();
    const result = await refreshCalendarAndSchedule(userId);
    return NextResponse.json(result);
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
