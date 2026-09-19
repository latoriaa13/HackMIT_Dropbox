import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";
import {
  ScheduleBuildBodySchema,
  buildAndStoreSchedule,
  getUserSchedule,
} from "@/lib/tuesday-schedule";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    const schedule = getUserSchedule(userId);
    return NextResponse.json({ schedule });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = ScheduleBuildBodySchema.parse(await request.json());
    const result = await buildAndStoreSchedule(userId, body);
    return NextResponse.json(result);
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
