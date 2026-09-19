import { NextResponse } from "next/server";
import { updateTaskStatus } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const userId = await getSessionUserId();
  const task = updateTaskStatus(id, userId, "paused");
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ task });
}
