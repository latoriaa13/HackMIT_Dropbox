import { describe, it, expect, vi } from "vitest";
import type { SchedulableFundraisingTask } from "@tuesday/core";
import {
  applyTaskApproval,
  applyTaskComplete,
  applyTaskDenial,
  approveScheduleTaskDraft,
} from "./schedule-task-approve";
import type { Microsoft365Provider } from "../provider/interface";

const task: SchedulableFundraisingTask = {
  id: "sched-a-renewal_ask",
  constituentId: "a",
  constituentName: "Maya Chen",
  actionType: "renewal_ask",
  title: "Personal renewal call — Maya Chen",
  description: "Renewal window",
  estimatedMinutes: 30,
  priority: 90,
  expectedOpportunity: 800,
  confidence: 0.8,
  requiredChannel: "phone",
  evidence: [{ code: "ev-0", label: "5 giving years" }],
  whyNow: "No FY2026 gift yet",
  schedulingStatus: "proposed",
  suggestedStart: "2026-09-15T14:00:00.000Z",
  suggestedEnd: "2026-09-15T14:30:00.000Z",
};

describe("schedule task approval", () => {
  it("creates event draft without external attendees for phone work", async () => {
    const createEventDraft = vi.fn().mockResolvedValue({
      draftId: "draft-1",
      approvalToken: "tok",
      subject: "Tuesday",
      start: task.suggestedStart!,
      end: task.suggestedEnd!,
      timezone: "America/New_York",
      attendees: [],
      bodyPreview: "preview",
      status: "draft",
      mode: "microsoft_graph",
    });
    const provider = { createEventDraft } as unknown as Microsoft365Provider;
    const draft = await approveScheduleTaskDraft(provider, "user-1", task, "http://localhost:3000");
    expect(draft.draftId).toBe("draft-1");
    expect(createEventDraft).toHaveBeenCalledWith(
      expect.objectContaining({ attendees: [] })
    );
  });

  it("denial does not call provider", () => {
    const schedule = {
      tasks: [task],
      timeline: [],
    } as never;
    const updated = applyTaskDenial(schedule, task.id);
    expect(updated.tasks[0].schedulingStatus).toBe("denied");
  });

  it("approval marks task approved with draft id", () => {
    const schedule = {
      tasks: [task],
      timeline: [],
    } as never;
    const updated = applyTaskApproval(schedule, task.id, "draft-99");
    expect(updated.tasks[0].schedulingStatus).toBe("approved");
    expect(updated.tasks[0].outlookDraftId).toBe("draft-99");
  });

  it("complete marks task completed", () => {
    const schedule = {
      tasks: [{ ...task, schedulingStatus: "approved" as const }],
      timeline: [],
    } as never;
    const updated = applyTaskComplete(schedule, task.id);
    expect(updated.tasks[0].schedulingStatus).toBe("completed");
  });
});
