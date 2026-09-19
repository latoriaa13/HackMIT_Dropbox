import { NextResponse } from "next/server";
import {
  applyTaskApproval,
  approveScheduleTaskDraft,
  getUserSchedule,
  saveUserSchedule,
  requireMicrosoft365Provider,
} from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";
import { assertCalendarAccess } from "@/lib/tuesday-schedule";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    assertCalendarAccess(userId);
    const { taskId } = await params;
    const schedule = getUserSchedule(userId);
    if (!schedule) {
      return NextResponse.json({ error: "No schedule generated yet" }, { status: 404 });
    }
    const task = schedule.tasks.find((t) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.schedulingStatus === "denied" || task.schedulingStatus === "completed") {
      return NextResponse.json({ error: "Task cannot be approved" }, { status: 400 });
    }
    const provider = requireMicrosoft365Provider(userId);
    const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const draft = await approveScheduleTaskDraft(provider, userId, task, appBase);
    const updated = applyTaskApproval(schedule, taskId, draft.draftId);
    saveUserSchedule(userId, updated);
    return NextResponse.json({
      schedule: updated,
      draft,
      message: "Outlook event draft created — confirm in Autopilot inbox before it appears on your calendar.",
    });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
