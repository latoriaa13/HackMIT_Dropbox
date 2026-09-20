import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { Microsoft365CalendarSyncError } from "@tuesday/m365";
import { m365ApiErrorResponse } from "@/lib/m365-response";
import { refreshCalendarAndSchedule } from "@/lib/tuesday-schedule";

const BodySchema = z.object({
  weekStart: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = BodySchema.parse(await request.json().catch(() => ({})));
    const result = await refreshCalendarAndSchedule(userId, { weekStart: body.weekStart });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Microsoft365CalendarSyncError) {
      return NextResponse.json({ ok: false, ...e.toJSON() });
    }
    return m365ApiErrorResponse(e);
  }
}
