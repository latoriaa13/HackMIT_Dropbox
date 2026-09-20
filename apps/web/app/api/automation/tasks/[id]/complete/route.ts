import { NextResponse } from "next/server";
import { appendAudit, getTask, updateTaskStatus } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  const { id } = await params;
  const task = getTask(id, userId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const updated = updateTaskStatus(id, userId, "completed", {
    lastRunAt: new Date().toISOString(),
  });
  appendAudit({
    userId,
    actionType: "task.completed",
    target: id,
    status: "executed",
    payloadSummary: task.title,
    executedAt: new Date().toISOString(),
  });
  return NextResponse.json({ task: updated, message: "Task marked complete." });
}
