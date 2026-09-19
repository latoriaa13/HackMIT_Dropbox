import { NextResponse } from "next/server";
import { applyTaskDenial, getUserSchedule, saveUserSchedule, appendAudit } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    const { taskId } = await params;
    const schedule = getUserSchedule(userId);
    if (!schedule) {
      return NextResponse.json({ error: "No schedule generated yet" }, { status: 404 });
    }
    const task = schedule.tasks.find((t) => t.id === taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    appendAudit({
      userId,
      actionType: "schedule.deny_task",
      target: task.constituentId,
      status: "rejected",
      payloadSummary: task.actionType,
    });
    const updated = applyTaskDenial(schedule, taskId);
    saveUserSchedule(userId, updated);
    return NextResponse.json({ schedule: updated });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
