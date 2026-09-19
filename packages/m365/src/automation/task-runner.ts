import type { ProcessedDataset } from "@tuesday/core";
import { buildTuesday } from "@tuesday/core";
import { requireMicrosoft365Provider } from "../provider/factory";
import { generateFollowUpEmail, checkEmailOutreachEligible } from "../drafts/grounded-email";
import { appendAudit } from "../storage/audit-log";
import { recordConstituentActivity } from "../storage/constituent-activity";
import { getTask, updateTaskStatus } from "./task-store";
import type { AutomationTask } from "./task-model";

export async function runAutomationTask(
  taskId: string,
  userId: string,
  dataset: ProcessedDataset
): Promise<AutomationTask | null> {
  const task = getTask(taskId, userId);
  if (!task || task.status === "cancelled" || task.status === "paused") return null;

  updateTaskStatus(taskId, userId, "running");
  const provider = requireMicrosoft365Provider(userId);

  try {
    for (const action of task.actions) {
      if (action.type === "draft_follow_up_emails") {
        const built = buildTuesday(dataset, {
          objective: "protect_renewals",
          staffHours: 8,
          channels: ["email", "phone", "event_invitation", "stewardship_message"],
          riskPreference: "balanced",
        });
        const limit = action.limit ?? 5;
        for (const item of built.items.slice(0, limit)) {
          const profile = dataset.profiles.find((p) => p.id === item.constituentId);
          if (!profile) continue;
          const elig = checkEmailOutreachEligible(profile);
          if (!elig.ok || !elig.to) continue;
          const { subject, body } = generateFollowUpEmail(profile, {
            recommendedAction: item.recommendedAction,
            whyNow: item.whyNow,
          });
          const draft = await provider.createEmailDraft({
            to: [elig.to],
            subject,
            body,
            relatedConstituentIds: [profile.id],
          });
          recordConstituentActivity({
            constituentId: profile.id,
            userId,
            type: "email_draft",
            summary: `Draft: ${subject}`,
            status: "awaiting_approval",
          });
          appendAudit({
            taskId,
            userId,
            actionType: "task.draft_follow_up",
            target: elig.to,
            status: "drafted",
            payloadSummary: draft.draftId,
          });
        }
      }
      if (action.type === "find_meeting_slots") {
        const now = new Date();
        const end = new Date(now.getTime() + 7 * 86400000);
        await provider.findFreeSlots({
          start: now.toISOString(),
          end: end.toISOString(),
          durationMinutes: 30,
          timezone: "America/New_York",
          workingHoursStart: 9,
          workingHoursEnd: 17,
        });
      }
    }
    return updateTaskStatus(taskId, userId, "completed", {
      lastRunAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Task failed";
    return updateTaskStatus(taskId, userId, "failed", { error: msg, lastRunAt: new Date().toISOString() });
  }
}
