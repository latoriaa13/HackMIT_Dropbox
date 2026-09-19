import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FindFreeSlotsInputSchema,
  getUserSchedule,
  saveUserSchedule,
  requireMicrosoft365Provider,
} from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";
import { assertCalendarAccess, rescheduleTaskInPlan } from "@/lib/tuesday-schedule";

type Params = { params: Promise<{ taskId: string }> };

const BodySchema = z.object({
  start: z.string(),
  end: z.string(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    assertCalendarAccess(userId);
    const { taskId } = await params;
    const body = BodySchema.parse(await request.json());
    const schedule = getUserSchedule(userId);
    if (!schedule) {
      return NextResponse.json({ error: "No schedule generated yet" }, { status: 404 });
    }
    const updated = rescheduleTaskInPlan(schedule, taskId, body.start, body.end);
    saveUserSchedule(userId, updated);
    return NextResponse.json({ schedule: updated });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}

export async function GET(request: Request, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    assertCalendarAccess(userId);
    const { taskId } = await params;
    const schedule = getUserSchedule(userId);
    const task = schedule?.tasks.find((t) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const url = new URL(request.url);
    const start = url.searchParams.get("start") ?? schedule!.weekStart;
    const end = url.searchParams.get("end") ?? schedule!.weekEnd;
    const provider = requireMicrosoft365Provider(userId);
    const input = FindFreeSlotsInputSchema.parse({
      start: `${start}T00:00:00`,
      end: `${end}T23:59:59`,
      durationMinutes: task.estimatedMinutes,
      timezone: schedule!.timezone,
      workingHoursStart: schedule!.preferences.workingHoursStart,
      workingHoursEnd: schedule!.preferences.workingHoursEnd,
    });
    const slots = await provider.findFreeSlots(input);
    return NextResponse.json({
      task,
      whyThisTime: task.whyThisTime,
      alternatives: slots.slice(0, 8),
    });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
