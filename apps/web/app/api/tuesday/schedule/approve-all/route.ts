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

export async function POST() {
  try {
    const userId = await getSessionUserId();
    assertCalendarAccess(userId);
    let schedule = getUserSchedule(userId);
    if (!schedule) {
      return NextResponse.json({ error: "No schedule generated yet" }, { status: 404 });
    }
    const provider = requireMicrosoft365Provider(userId);
    const appBase = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const approved: string[] = [];
    for (const task of schedule.tasks) {
      if (task.schedulingStatus !== "proposed") continue;
      if (task.hasCalendarConflict) continue;
      const draft = await approveScheduleTaskDraft(provider, userId, task, appBase, schedule.timezone);
      schedule = applyTaskApproval(schedule, task.id, draft.draftId);
      approved.push(task.id);
    }
    saveUserSchedule(userId, schedule);
    return NextResponse.json({
      schedule,
      approvedCount: approved.length,
      message: `${approved.length} task draft(s) created — confirm each in Autopilot.`,
    });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
