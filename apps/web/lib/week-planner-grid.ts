import type { CalendarAwareSchedule, OutlookBusyBlock, SchedulableFundraisingTask } from "@tuesday/core";
import { isBlockingOutlookEvent, outlookEventDisplayLabel } from "@tuesday/core";

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

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}–${e.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function dayKeys(weekStart: string, workDays: number): string[] {
  const keys: string[] = [];
  const d = new Date(`${weekStart}T12:00:00`);
  for (let i = 0; i < workDays; i++) {
    const x = new Date(d);
    x.setDate(x.getDate() + i);
    keys.push(x.toISOString().slice(0, 10));
  }
  return keys;
}

export function buildWeekGrid(input: {
  schedule?: CalendarAwareSchedule | null;
  outlookEvents?: OutlookBusyBlock[];
  weekStart: string;
  workDays?: number;
}): Record<string, WeekGridBlock[]> {
  const workDays = input.schedule?.preferences.workDays ?? input.workDays ?? 5;
  const days = dayKeys(input.schedule?.weekStart ?? input.weekStart, workDays);
  const outlook = input.schedule?.outlookEvents ?? input.outlookEvents ?? [];
  const tasks = input.schedule?.tasks ?? [];

  const byDay: Record<string, WeekGridBlock[]> = {};
  for (const day of days) byDay[day] = [];

  for (const ev of outlook) {
    const day = ev.start.slice(0, 10);
    if (!byDay[day]) continue;
    const blocking = isBlockingOutlookEvent(ev);
    byDay[day].push({
      id: `outlook-${ev.id}`,
      kind: blocking ? "outlook_busy" : "outlook_free",
      start: ev.start,
      end: ev.end,
      label: `${formatRange(ev.start, ev.end)} · ${blocking ? "Busy" : "Outlook"} · ${outlookEventDisplayLabel(ev)}`,
      detail: blocking ? "Not available for Tuesday task placement" : "Shown for context — does not block scheduling",
    });
  }

  for (const task of tasks) {
    if (!task.suggestedStart || !task.suggestedEnd) continue;
    if (task.schedulingStatus === "denied") continue;
    const day = task.suggestedStart.slice(0, 10);
    if (!byDay[day]) continue;
    const approved = task.schedulingStatus === "approved";
    byDay[day].push({
      id: task.id,
      kind: "fundraising",
      start: task.suggestedStart,
      end: task.suggestedEnd,
      label: `${formatRange(task.suggestedStart, task.suggestedEnd)} · ${task.title}`,
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

export function dayTitle(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
