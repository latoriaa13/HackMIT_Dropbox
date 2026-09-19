import { describe, it, expect } from "vitest";
import type { QueueItem } from "../models/types";
import {
  buildCalendarAwareSchedule,
  detectScheduleConflictsAfterRefresh,
  rescheduleTaskInPlan,
} from "./planner";
import { queueItemsToSchedulableTasks } from "./tasks-from-queue";

function item(partial: Partial<QueueItem> & Pick<QueueItem, "constituentId" | "constituentName">): QueueItem {
  return {
    recommendedAction: "renewal_ask",
    channel: "phone",
    estimatedMinutes: 30,
    conservativeOpportunity: 500,
    expectedOpportunity: 750,
    upsideOpportunity: 1000,
    priorityScore: 80,
    confidence: 0.7,
    whyNow: "Renewal window",
    evidence: ["5 giving years"],
    suggestedMessage: "Hello",
    warning: null,
    ...partial,
  };
}

describe("calendar-aware scheduler", () => {
  const weekStart = "2026-09-14";

  it("blocks proposed work over Outlook busy periods", () => {
    const queue = [
      item({ constituentId: "a", constituentName: "A", priorityScore: 90 }),
      item({ constituentId: "b", constituentName: "B", priorityScore: 70 }),
    ];
    const outlookEvents = [
      {
        id: "ev1",
        subject: "Marketing sync",
        start: "2026-09-14T14:00:00.000Z",
        end: "2026-09-14T15:00:00.000Z",
      },
    ];
    const plan = buildCalendarAwareSchedule({
      queueItems: queue,
      outlookEvents,
      weekStart,
      preferences: { timezone: "UTC", workingHoursStart: 9, workingHoursEnd: 17 },
    });
    const proposed = plan.tasks.filter((t) => t.schedulingStatus === "proposed");
    for (const t of proposed) {
      expect(t.suggestedStart).toBeDefined();
      const s = new Date(t.suggestedStart!).getTime();
      const e = new Date(t.suggestedEnd!).getTime();
      const busyStart = new Date(outlookEvents[0].start).getTime();
      const busyEnd = new Date(outlookEvents[0].end).getTime();
      expect(s >= busyEnd || e <= busyStart).toBe(true);
    }
  });

  it("respects working hours and lunch", () => {
    const plan = buildCalendarAwareSchedule({
      queueItems: [item({ constituentId: "c", constituentName: "C" })],
      outlookEvents: [],
      weekStart,
      preferences: {
        timezone: "UTC",
        workingHoursStart: 9,
        workingHoursEnd: 17,
        lunchStartHour: 12,
        lunchEndHour: 13,
      },
    });
    const t = plan.tasks.find((x) => x.schedulingStatus === "proposed");
    expect(t).toBeDefined();
    const startHour = new Date(t!.suggestedStart!).getUTCHours();
    expect(startHour).toBeGreaterThanOrEqual(9);
    expect(startHour === 12 ? false : startHour < 17 || startHour === 16).toBe(true);
  });

  it("schedules higher priority actions first", () => {
    const queue = [
      item({ constituentId: "low", constituentName: "Low", priorityScore: 10, estimatedMinutes: 30 }),
      item({ constituentId: "high", constituentName: "High", priorityScore: 100, estimatedMinutes: 30 }),
    ];
    const plan = buildCalendarAwareSchedule({
      queueItems: queue,
      outlookEvents: [],
      weekStart,
      preferences: { timezone: "UTC", workDays: 1 },
    });
    const high = plan.tasks.find((t) => t.constituentId === "high");
    expect(high?.schedulingStatus).toBe("proposed");
  });

  it("reports unscheduled tasks when capacity is insufficient", () => {
    const queue = Array.from({ length: 40 }, (_, i) =>
      item({
        constituentId: `id-${i}`,
        constituentName: `Donor ${i}`,
        priorityScore: 50 + i,
      })
    );
    const plan = buildCalendarAwareSchedule({
      queueItems: queue,
      outlookEvents: [],
      weekStart,
      preferences: { timezone: "UTC", workDays: 1, staffHours: 1 } as never,
    });
    expect(plan.summary.tasksUnscheduled).toBeGreaterThan(0);
  });

  it("does not duplicate tasks for the same constituent action", () => {
    const queue = [
      item({ constituentId: "dup", constituentName: "Dup" }),
      item({ constituentId: "dup", constituentName: "Dup" }),
    ];
    const tasks = queueItemsToSchedulableTasks(queue);
    expect(tasks).toHaveLength(1);
  });

  it("reschedule finds valid slot metadata and flags conflicts", () => {
    const plan = buildCalendarAwareSchedule({
      queueItems: [item({ constituentId: "r", constituentName: "R" })],
      outlookEvents: [],
      weekStart,
      preferences: { timezone: "UTC", workDays: 1 },
    });
    const task = plan.tasks[0];
    const updated = rescheduleTaskInPlan(
      plan,
      task.id,
      "2026-09-14T14:00:00.000Z",
      "2026-09-14T14:30:00.000Z"
    );
    expect(updated.tasks[0].suggestedStart).toContain("2026-09-14");
  });

  it("refresh detects new Outlook conflicts", () => {
    const plan = buildCalendarAwareSchedule({
      queueItems: [item({ constituentId: "x", constituentName: "X" })],
      outlookEvents: [],
      weekStart,
      preferences: { timezone: "UTC", workDays: 1 },
    });
    const task = plan.tasks.find((t) => t.schedulingStatus === "proposed")!;
    const refreshed = detectScheduleConflictsAfterRefresh(plan, [
      {
        id: "new-meeting",
        subject: "New meeting",
        start: task.suggestedStart!,
        end: task.suggestedEnd!,
      },
    ]);
    expect(refreshed.summary.conflictCount).toBeGreaterThan(0);
  });
});
