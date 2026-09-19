import { NextResponse } from "next/server";
import { runAutomationTask } from "@tuesday/m365";
import { loadDataset } from "@/lib/data-store";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const userId = await getSessionUserId();
    const dataset = loadDataset();
    const task = await runAutomationTask(id, userId, dataset);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ task });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
