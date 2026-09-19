import type { QueueItem } from "../models/types";
import type { ActionType } from "../models/types";
import { ACTION_LABELS } from "../actions/action-config";
import { SCHEDULING_ACTION_MINUTES } from "../config/scheduling-config";
import type { RequiredChannel, SchedulableFundraisingTask } from "./types";

function requiredChannelFor(item: QueueItem): RequiredChannel {
  if (item.channel === "phone") return "phone";
  if (item.channel === "email" || item.channel === "stewardship_message") return "email";
  if (item.recommendedAction === "event_invitation") return "meeting";
  if (item.recommendedAction === "data_quality_task") return "planning";
  return "planning";
}

function preferredTime(action: ActionType): "morning" | "afternoon" | "any" {
  if (action === "personal_call" || action === "renewal_ask" || action === "upgrade_ask") {
    return "morning";
  }
  if (action === "data_quality_task") return "afternoon";
  return "any";
}

export function queueItemsToSchedulableTasks(items: QueueItem[]): SchedulableFundraisingTask[] {
  const seen = new Set<string>();
  const tasks: SchedulableFundraisingTask[] = [];

  for (const item of items) {
    if (item.recommendedAction === "no_action") continue;
    const key = `${item.constituentId}:${item.recommendedAction}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const minutes = SCHEDULING_ACTION_MINUTES[item.recommendedAction] ?? item.estimatedMinutes;
    tasks.push({
      id: `sched-${item.constituentId}-${item.recommendedAction}`,
      constituentId: item.constituentId,
      constituentName: item.constituentName,
      actionType: item.recommendedAction,
      title: `${ACTION_LABELS[item.recommendedAction]} — ${item.constituentName}`,
      description: item.whyNow,
      estimatedMinutes: minutes,
      priority: item.priorityScore,
      expectedOpportunity: item.expectedOpportunity,
      conservativeOpportunity: item.conservativeOpportunity,
      confidence: item.confidence,
      preferredTimeOfDay: preferredTime(item.recommendedAction),
      requiredChannel: requiredChannelFor(item),
      evidence: item.evidence.map((label, i) => ({ code: `ev-${i}`, label })),
      whyNow: item.whyNow,
      schedulingStatus: "unscheduled",
    });
  }

  tasks.sort((a, b) => b.priority / b.estimatedMinutes - a.priority / a.estimatedMinutes);
  return tasks;
}
