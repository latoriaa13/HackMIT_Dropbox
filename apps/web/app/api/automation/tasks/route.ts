import { NextResponse } from "next/server";
import { CreateTaskInputSchema, createTask, listTasks } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  return NextResponse.json({ tasks: listTasks(userId) });
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const input = CreateTaskInputSchema.parse(await request.json());
    const actions =
      input.templateId === "weekly_top_opportunities"
        ? [{ type: "draft_follow_up_emails" as const, limit: 5 }]
        : input.templateId === "find_meeting_slots"
          ? [{ type: "find_meeting_slots" as const }]
          : [{ type: "draft_follow_up_emails" as const, limit: 3 }];

    const task = createTask(userId, {
      title: input.title,
      instruction: input.instruction,
      trigger: input.trigger,
      actions,
      requiresApproval: input.requiresApproval,
      nextRunAt:
        input.trigger.type === "once"
          ? input.trigger.runAt
          : input.trigger.type === "recurring"
            ? new Date().toISOString()
            : undefined,
    });
    return NextResponse.json({ task });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
