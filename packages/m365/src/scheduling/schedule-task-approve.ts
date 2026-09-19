import type { CalendarAwareSchedule, SchedulableFundraisingTask } from "@tuesday/core";
import { ACTION_LABELS } from "@tuesday/core";
import type { Microsoft365Provider } from "../provider/interface";
import { appendAudit } from "../storage/audit-log";
import { recordConstituentActivity } from "../storage/constituent-activity";

function eventSubject(task: SchedulableFundraisingTask): string {
  return `Tuesday: ${ACTION_LABELS[task.actionType]} — ${task.constituentName}`;
}

function eventBody(task: SchedulableFundraisingTask, appUrl: string): string {
  const lines = [
    task.description,
    "",
    `Why now: ${task.whyNow}`,
    task.evidence.length ? `Evidence: ${task.evidence.map((e) => e.label).join("; ")}` : "",
    "",
    `Constituent: ${appUrl}/constituents/${task.constituentId}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Creates a pending Outlook event draft — does not send invitations until Autopilot approval. */
export async function approveScheduleTaskDraft(
  provider: Microsoft365Provider,
  userId: string,
  task: SchedulableFundraisingTask,
  appBaseUrl: string
) {
  if (!task.suggestedStart || !task.suggestedEnd) {
    throw new Error("Task has no proposed time");
  }
  if (task.hasCalendarConflict) {
    throw new Error("Resolve calendar conflicts before approving");
  }

  const withAttendees = task.requiredChannel === "meeting";
  const draft = await provider.createEventDraft({
    subject: eventSubject(task),
    start: task.suggestedStart,
    end: task.suggestedEnd,
    timezone: "America/New_York",
    location: withAttendees ? "Video call (TBD)" : undefined,
    attendees: [],
    body: eventBody(task, appBaseUrl),
    relatedConstituentIds: [task.constituentId],
  });

  appendAudit({
    userId,
    actionType: "schedule.approve_task_draft",
    target: task.constituentId,
    status: "drafted",
    payloadSummary: `${task.actionType} · ${task.suggestedStart}`,
  });

  recordConstituentActivity({
    constituentId: task.constituentId,
    userId,
    type: "event_draft",
    summary: `Schedule approved: ${ACTION_LABELS[task.actionType]} (draft ${draft.draftId})`,
    status: "pending_approval",
  });

  return draft;
}

export function applyTaskApproval(
  schedule: CalendarAwareSchedule,
  taskId: string,
  draftId: string
): CalendarAwareSchedule {
  return {
    ...schedule,
    tasks: schedule.tasks.map((t) =>
      t.id === taskId
        ? { ...t, schedulingStatus: "approved", outlookDraftId: draftId, hasCalendarConflict: false }
        : t
    ),
  };
}

export function applyTaskDenial(schedule: CalendarAwareSchedule, taskId: string): CalendarAwareSchedule {
  return {
    ...schedule,
    tasks: schedule.tasks.map((t) =>
      t.id === taskId ? { ...t, schedulingStatus: "denied" } : t
    ),
  };
}
