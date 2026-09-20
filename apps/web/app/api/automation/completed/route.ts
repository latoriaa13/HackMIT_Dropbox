import { NextResponse } from "next/server";
import { getUserSchedule, listAudit, listTasks } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  const audit = listAudit(userId, 100).filter(
    (e) =>
      e.status === "executed" &&
      (e.actionType === "mail.send_draft" ||
        e.actionType === "calendar.send_event_invitation" ||
        e.actionType === "schedule.task_completed" ||
        e.actionType === "task.completed")
  );
  const schedule = getUserSchedule(userId);
  const scheduleTasks =
    schedule?.tasks.filter((t) => t.schedulingStatus === "completed") ?? [];
  const automationTasks = listTasks(userId).filter((t) => t.status === "completed");
  return NextResponse.json({ audit, scheduleTasks, automationTasks });
}
