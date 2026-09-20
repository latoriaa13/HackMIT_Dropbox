import { NextResponse } from "next/server";
import { completeScheduleTask } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const userId = await getSessionUserId();
    const { taskId } = await params;
    const schedule = completeScheduleTask(userId, taskId);
    if (!schedule) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({
      schedule,
      message: "Task marked complete.",
    });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
