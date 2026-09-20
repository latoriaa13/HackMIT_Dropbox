import type { CalendarAwareSchedule, OutlookBusyBlock, SchedulableFundraisingTask } from "@tuesday/core";
import {
  isBlockingOutlookEvent,
  outlookEventDisplayLabel,
  formatTimeRangeInZone,
  dayTitleInZone,
  dayKeysInZone,
  utcIsoToDateKey,
  DEFAULT_SCHEDULING_PREFERENCES,
} from "@tuesday/core";

export type WeekGridBlock = {
  id: string;
  kind: "outlook_busy" | "outlook_free" | "fundraising" | "available";
  start: string;
  end: string;
  label: string;
  detail?: string;
  taskId?: string;
  conflict?: boolean;
  status?: SchedulableFundraisingTask["schedulingStatus"];
};

export function buildWeekGrid(input: {
  schedule?: CalendarAwareSchedule | null;
  outlookEvents?: OutlookBusyBlock[];
  weekStart: string;
  workDays?: number;
  timezone?: string;
}): Record<string, WeekGridBlock[]> {
  const zone =
    input.schedule?.timezone ?? input.timezone ?? DEFAULT_SCHEDULING_PREFERENCES.timezone;
  const workDays = input.schedule?.preferences.workDays ?? input.workDays ?? 5;
  const ws = input.schedule?.weekStart ?? input.weekStart;
  const days = dayKeysInZone(ws, workDays, zone);
  const outlook = input.schedule?.outlookEvents ?? input.outlookEvents ?? [];
  const tasks = input.schedule?.tasks ?? [];

  const byDay: Record<string, WeekGridBlock[]> = {};
  for (const day of days) byDay[day] = [];

  for (const ev of outlook) {
    const day = utcIsoToDateKey(ev.start, zone);
    if (!byDay[day]) continue;
    const blocking = isBlockingOutlookEvent(ev);
    byDay[day].push({
      id: `outlook-${ev.id}`,
      kind: blocking ? "outlook_busy" : "outlook_free",
      start: ev.start,
      end: ev.end,
      label: `${formatTimeRangeInZone(ev.start, ev.end, zone)} · ${blocking ? "Busy" : "Outlook"} · ${outlookEventDisplayLabel(ev)}`,
      detail: blocking ? "Not available for fundraising task placement" : "Shown for context — does not block scheduling",
    });
  }

  for (const task of tasks) {
    if (!task.suggestedStart || !task.suggestedEnd) continue;
    if (task.schedulingStatus === "denied") continue;
    const day = utcIsoToDateKey(task.suggestedStart, zone);
    if (!byDay[day]) continue;
    const approved = task.schedulingStatus === "approved";
    byDay[day].push({
      id: task.id,
      kind: "fundraising",
      start: task.suggestedStart,
      end: task.suggestedEnd,
      label: `${formatTimeRangeInZone(task.suggestedStart, task.suggestedEnd, zone)} · ${task.title}`,
      detail: task.whyNow,
      taskId: task.id,
      conflict: task.hasCalendarConflict,
      status: task.schedulingStatus,
    });
    void approved;
  }

  for (const day of days) {
    byDay[day].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  return byDay;
}

export function dayTitle(dateKey: string, timezone?: string) {
  return dayTitleInZone(dateKey, timezone ?? DEFAULT_SCHEDULING_PREFERENCES.timezone);
}
