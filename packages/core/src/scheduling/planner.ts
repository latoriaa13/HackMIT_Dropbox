import {
  DEFAULT_SCHEDULING_PREFERENCES,
  isIntensiveCallAction,
  type SchedulingPreferences,
} from "../config/scheduling-config";
import type { QueueItem } from "../models/types";
import { queueItemsToSchedulableTasks } from "./tasks-from-queue";
import type {
  CalendarAwareSchedule,
  OutlookBusyBlock,
  ScheduleTimelineEntry,
  SchedulableFundraisingTask,
  ScheduleSummary,
} from "./types";
import { DateTime } from "luxon";
import { isBlockingOutlookEvent, outlookEventDisplayLabel } from "./outlook-busy";
import {
  assertIanaZone,
  hourInZone,
  parseWeekStartInZone,
  utcIsoToDateKey,
  weekRangeFromStartInZone,
} from "./timezone";

type TimeInterval = { startMs: number; endMs: number };

function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  const out: TimeInterval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, cur.endMs);
    } else {
      out.push(cur);
    }
  }
  return out;
}

function subtractBusy(free: TimeInterval[], busy: TimeInterval[]): TimeInterval[] {
  let slots = [...free];
  for (const b of busy) {
    const next: TimeInterval[] = [];
    for (const s of slots) {
      if (b.endMs <= s.startMs || b.startMs >= s.endMs) {
        next.push(s);
        continue;
      }
      if (b.startMs > s.startMs) {
        next.push({ startMs: s.startMs, endMs: b.startMs });
      }
      if (b.endMs < s.endMs) {
        next.push({ startMs: b.endMs, endMs: s.endMs });
      }
    }
    slots = next;
  }
  return slots.filter((s) => s.endMs - s.startMs >= 5 * 60_000);
}

function dayWorkWindow(day: DateTime, prefs: SchedulingPreferences): TimeInterval[] {
  const start = day.set({
    hour: prefs.workingHoursStart,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const end = day.set({
    hour: prefs.workingHoursEnd,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const lunchStart = day.set({
    hour: prefs.lunchStartHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const lunchEnd = day.set({
    hour: prefs.lunchEndHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const work: TimeInterval[] = [
    { startMs: start.toUTC().toMillis(), endMs: end.toUTC().toMillis() },
  ];
  if (prefs.lunchEndHour > prefs.lunchStartHour) {
    return subtractBusy(work, [
      { startMs: lunchStart.toUTC().toMillis(), endMs: lunchEnd.toUTC().toMillis() },
    ]);
  }
  return work;
}

function scoreSlotForTask(
  slotStart: number,
  task: SchedulableFundraisingTask,
  prefs: SchedulingPreferences
): number {
  const hour = hourInZone(slotStart, prefs.timezone);
  let score = task.priority;
  if (task.preferredTimeOfDay === "morning" && hour < 12) score += 20;
  if (task.preferredTimeOfDay === "afternoon" && hour >= prefs.lunchEndHour) score += 20;
  return score;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function buildCalendarAwareSchedule(input: {
  queueItems: QueueItem[];
  outlookEvents: OutlookBusyBlock[];
  weekStart?: string;
  preferences?: Partial<SchedulingPreferences>;
  generatedAt?: string;
}): CalendarAwareSchedule {
  const prefs: SchedulingPreferences = { ...DEFAULT_SCHEDULING_PREFERENCES, ...input.preferences };
  const zone = assertIanaZone(prefs.timezone);
  const weekStartMonday = parseWeekStartInZone(input.weekStart, zone);
  const { weekStart, weekEnd } = weekRangeFromStartInZone(weekStartMonday, prefs.workDays);
  const tasks = queueItemsToSchedulableTasks(input.queueItems);

  const timeline: ScheduleTimelineEntry[] = [];
  const busyByDay = new Map<string, OutlookBusyBlock[]>();

  const blockingEvents = input.outlookEvents.filter(isBlockingOutlookEvent);

  for (const ev of input.outlookEvents) {
    const day = utcIsoToDateKey(ev.start, zone);
    if (!busyByDay.has(day)) busyByDay.set(day, []);
    busyByDay.get(day)!.push(ev);
    const blocking = isBlockingOutlookEvent(ev);
    timeline.push({
      id: `outlook-${ev.id}`,
      kind: "outlook_event",
      date: day,
      start: ev.start,
      end: ev.end,
      label: blocking ? `Busy (Outlook) · ${outlookEventDisplayLabel(ev)}` : outlookEventDisplayLabel(ev),
      detail: blocking
        ? [ev.location, "Tuesday will not schedule fundraising work during this block."].filter(Boolean).join(" · ")
        : ev.location,
      outlookEventId: ev.id,
    });
  }

  const placedBusy: TimeInterval[] = blockingEvents.map((ev) => ({
    startMs: new Date(ev.start).getTime(),
    endMs: new Date(ev.end).getTime(),
  }));

  let totalAvailableWorkMinutes = 0;
  let availableFundraisingMinutes = 0;
  let lastIntensiveEndMs: number | null = null;
  const bufferMs = prefs.bufferBetweenTasksMinutes * 60_000;
  const intensiveGapMs = prefs.gapAfterIntensiveCallMinutes * 60_000;

  const freeSlotsByDay: TimeInterval[][] = [];
  for (let d = 0; d < prefs.workDays; d++) {
    const day = weekStartMonday.plus({ days: d }).startOf("day");
    const dayKey = day.toISODate()!;

    let freeSlots = dayWorkWindow(day, prefs);
    const dayBusy = (busyByDay.get(dayKey) ?? []).map((ev) => ({
      startMs: new Date(ev.start).getTime(),
      endMs: new Date(ev.end).getTime(),
    }));
    freeSlots = subtractBusy(
      freeSlots,
      mergeIntervals([
        ...placedBusy.filter((b) => utcIsoToDateKey(new Date(b.startMs).toISOString(), zone) === dayKey),
        ...dayBusy,
      ])
    );
    freeSlotsByDay.push(freeSlots);

    for (const slot of freeSlots) {
      const mins = (slot.endMs - slot.startMs) / 60_000;
      totalAvailableWorkMinutes += mins;
      availableFundraisingMinutes += mins;
      timeline.push({
        id: `free-${dayKey}-${slot.startMs}`,
        kind: "free_block",
        date: dayKey,
        start: new Date(slot.startMs).toISOString(),
        end: new Date(slot.endMs).toISOString(),
        label: "Available work block",
      });
    }
  }

  for (const task of tasks) {
    const candidates: Array<{ startMs: number; endMs: number; score: number }> = [];

    for (const freeSlots of freeSlotsByDay) {
      for (const slot of freeSlots) {
        let cursor = slot.startMs;
        while (cursor + task.estimatedMinutes * 60_000 + bufferMs <= slot.endMs) {
          const endMs = cursor + task.estimatedMinutes * 60_000;
          if (lastIntensiveEndMs != null && isIntensiveCallAction(task.actionType)) {
            if (cursor < lastIntensiveEndMs + intensiveGapMs) {
              cursor += 15 * 60_000;
              continue;
            }
          }
          const conflict = placedBusy.some((b) => overlaps(cursor, endMs, b.startMs, b.endMs));
          if (!conflict) {
            candidates.push({
              startMs: cursor,
              endMs,
              score: scoreSlotForTask(cursor, task, prefs),
            });
          }
          cursor += 15 * 60_000;
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best) continue;

    task.suggestedStart = new Date(best.startMs).toISOString();
    task.suggestedEnd = new Date(best.endMs).toISOString();
    task.schedulingStatus = "proposed";
    task.whyThisTime = explainWhyThisTime(task, best.startMs, prefs);

    placedBusy.push({ startMs: best.startMs, endMs: best.endMs + bufferMs });
    if (isIntensiveCallAction(task.actionType)) {
      lastIntensiveEndMs = best.endMs;
    }

    timeline.push({
      id: task.id,
      kind: "fundraising_task",
      date: utcIsoToDateKey(task.suggestedStart!, zone),
      start: task.suggestedStart,
      end: task.suggestedEnd,
      label: task.title,
      detail: task.whyNow,
      taskId: task.id,
    });

    availableFundraisingMinutes -= task.estimatedMinutes + prefs.bufferBetweenTasksMinutes;
  }

  const reserveDay = weekStartMonday.plus({ days: prefs.workDays - 1 }).startOf("day");
  const reserveEnd = reserveDay.set({
    hour: prefs.workingHoursEnd,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const reserveStart = reserveEnd.minus({ minutes: prefs.reserveBufferMinutes });
  timeline.push({
    id: "buffer-reserve",
    kind: "buffer",
    date: reserveDay.toISODate()!,
    start: reserveStart.toUTC().toISO()!,
    end: reserveEnd.toUTC().toISO()!,
    label: "Buffer / unscheduled follow-up",
  });

  const scheduledTasks = tasks.filter((t) => t.schedulingStatus === "proposed");
  const unscheduled = tasks.filter((t) => t.schedulingStatus === "unscheduled");

  const summary: ScheduleSummary = {
    tasksProposed: tasks.length,
    tasksScheduled: scheduledTasks.length,
    tasksUnscheduled: unscheduled.length,
    scheduledMinutes: scheduledTasks.reduce((s, t) => s + t.estimatedMinutes, 0),
    availableFundraisingMinutes: Math.max(0, Math.round(availableFundraisingMinutes)),
    totalAvailableWorkMinutes: Math.round(totalAvailableWorkMinutes),
    outlookMeetingCount: input.outlookEvents.length,
    conservativeOpportunity: tasks.reduce((s, t) => s + (t.conservativeOpportunity ?? 0), 0),
    expectedOpportunity: tasks.reduce((s, t) => s + t.expectedOpportunity, 0),
    conflictCount: tasks.filter((t) => t.hasCalendarConflict).length,
  };

  timeline.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return {
    weekStart,
    weekEnd,
    timezone: prefs.timezone,
    preferences: prefs,
    tasks,
    timeline,
    outlookEvents: input.outlookEvents,
    summary,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}

function explainWhyThisTime(
  task: SchedulableFundraisingTask,
  startMs: number,
  prefs: SchedulingPreferences
): string {
  const hour = hourInZone(startMs, prefs.timezone);
  const parts: string[] = ["Fits an open block on your Outlook calendar."];
  if (task.preferredTimeOfDay === "morning" && hour < 12) {
    parts.push("Morning slot preferred for live outreach.");
  }
  if (task.preferredTimeOfDay === "afternoon" && hour >= prefs.lunchEndHour) {
    parts.push("Afternoon slot for focused follow-up work.");
  }
  if (isIntensiveCallAction(task.actionType)) {
    parts.push("Spaced from other intensive calls.");
  }
  return parts.join(" ");
}

export function rescheduleTaskInPlan(
  schedule: CalendarAwareSchedule,
  taskId: string,
  newStart: string,
  newEnd: string
): CalendarAwareSchedule {
  const task = schedule.tasks.find((t) => t.id === taskId);
  if (!task) return schedule;

  const startMs = new Date(newStart).getTime();
  const endMs = new Date(newEnd).getTime();
  const conflict = schedule.outlookEvents.some((ev) =>
    overlaps(startMs, endMs, new Date(ev.start).getTime(), new Date(ev.end).getTime())
  );

  const updatedTasks = schedule.tasks.map((t) => {
    if (t.id !== taskId) return t;
    const wasApproved = t.schedulingStatus === "approved";
    return {
      ...t,
      suggestedStart: newStart,
      suggestedEnd: newEnd,
      schedulingStatus: wasApproved ? ("reschedule_requested" as const) : ("proposed" as const),
      hasCalendarConflict: conflict,
      whyThisTime: conflict
        ? "Selected slot overlaps an Outlook meeting — review before approving."
        : "Rescheduled to an available slot you selected.",
    };
  });

  const timeline = schedule.timeline.filter((e) => e.taskId !== taskId);
  timeline.push({
    id: taskId,
    kind: conflict ? "conflict" : "fundraising_task",
    date: utcIsoToDateKey(newStart, schedule.timezone),
    start: newStart,
    end: newEnd,
    label: task.title,
    detail: task.whyNow,
    taskId,
    conflict,
  });
  timeline.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return {
    ...schedule,
    tasks: updatedTasks,
    timeline,
    summary: {
      ...schedule.summary,
      conflictCount: updatedTasks.filter((t) => t.hasCalendarConflict).length,
    },
  };
}

export function detectScheduleConflictsAfterRefresh(
  schedule: CalendarAwareSchedule,
  outlookEvents: OutlookBusyBlock[]
): CalendarAwareSchedule {
  const tasks = schedule.tasks.map((task) => {
    if (!task.suggestedStart || !task.suggestedEnd) return task;
    if (task.schedulingStatus === "denied" || task.schedulingStatus === "completed") return task;
    const startMs = new Date(task.suggestedStart).getTime();
    const endMs = new Date(task.suggestedEnd).getTime();
    const conflict = outlookEvents.some((ev) =>
      overlaps(startMs, endMs, new Date(ev.start).getTime(), new Date(ev.end).getTime())
    );
    if (!conflict) return task;
    return {
      ...task,
      hasCalendarConflict: true,
      schedulingStatus:
        task.schedulingStatus === "approved" ? ("reschedule_requested" as const) : task.schedulingStatus,
    };
  });

  return {
    ...schedule,
    tasks,
    outlookEvents,
    summary: {
      ...schedule.summary,
      outlookMeetingCount: outlookEvents.length,
      conflictCount: tasks.filter((t) => t.hasCalendarConflict).length,
    },
  };
}
