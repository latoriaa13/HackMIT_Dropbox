import type { ActionType, Channel, QueueItem } from "../models/types";
import { ACTION_LABELS } from "../actions/action-config";
import { DEFAULT_FISCAL_CONFIG } from "../config/fiscal-year";

export type CalendarStepKind = "day_prep" | "constituent_action" | "day_wrap";

export type CalendarStep = {
  stepIndex: number;
  date: string;
  dayLabel: string;
  weekday: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  kind: CalendarStepKind;
  title: string;
  detail: string;
  constituentId?: string;
  constituentName?: string;
  action?: ActionType;
  channel?: Channel | "none";
  expectedOpportunity?: number;
  whyNow?: string;
};

export type CalendarDay = {
  date: string;
  dayLabel: string;
  weekday: string;
  totalMinutes: number;
  steps: CalendarStep[];
};

export type WeeklyCalendar = {
  weekStart: string;
  weekEnd: string;
  workDays: number;
  dayStartHour: number;
  dayEndHour: number;
  bufferMinutes: number;
  minutesPerDay: number;
  days: CalendarDay[];
  steps: CalendarStep[];
};

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PREP_MINUTES = 15;
const WRAP_MINUTES = 15;

export function buildWeeklyCalendar(
  items: QueueItem[],
  staffHours: number,
  options?: {
    referenceDate?: string;
    workDays?: number;
    dayStartHour?: number;
    dayEndHour?: number;
    bufferMinutes?: number;
  }
): WeeklyCalendar {
  const referenceDate = options?.referenceDate ?? DEFAULT_FISCAL_CONFIG.referenceDate;
  const workDays = options?.workDays ?? 5;
  const dayStartHour = options?.dayStartHour ?? 9;
  const dayEndHour = options?.dayEndHour ?? 17;
  const bufferMinutes = options?.bufferMinutes ?? 5;

  const weekStart = mondayOfWeek(new Date(referenceDate + "T12:00:00"));
  const outreachBudgetMinutes = staffHours * 60;
  const outreachPerDay = Math.max(30, Math.floor(outreachBudgetMinutes / workDays));

  const days: CalendarDay[] = [];
  for (let i = 0; i < workDays; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push({
      date: isoDate(d),
      dayLabel: formatDayLabel(d),
      weekday: WEEKDAY_NAMES[d.getDay()],
      totalMinutes: 0,
      steps: [],
    });
  }

  const allSteps: CalendarStep[] = [];
  let stepIndex = 0;
  let itemIdx = 0;

  for (let d = 0; d < workDays && itemIdx < items.length; d++) {
    const day = days[d];
    let clock = dayStartHour * 60;
    let outreachLeft = outreachPerDay;

    if (clock + PREP_MINUTES <= dayEndHour * 60) {
      const step = makeStep(day, stepIndex++, clock, PREP_MINUTES, "day_prep", "Morning prep", "Review today’s calendar, open records, confirm contact channels.");
      pushStep(day, allSteps, step);
      clock += PREP_MINUTES + bufferMinutes;
    }

    let actionsToday = 0;
    while (itemIdx < items.length) {
      const item = items[itemIdx];
      const taskMinutes = item.estimatedMinutes;
      if (outreachLeft < taskMinutes) break;
      if (clock + taskMinutes > dayEndHour * 60) break;

      const step = makeStep(
        day,
        stepIndex++,
        clock,
        taskMinutes,
        "constituent_action",
        item.constituentName,
        `${ACTION_LABELS[item.recommendedAction]} · ${item.channel}`,
        item
      );
      pushStep(day, allSteps, step);
      clock += taskMinutes + bufferMinutes;
      outreachLeft -= taskMinutes;
      actionsToday++;
      itemIdx++;
    }

    if (actionsToday > 0 && clock + WRAP_MINUTES <= dayEndHour * 60) {
      const step = makeStep(
        day,
        stepIndex++,
        clock,
        WRAP_MINUTES,
        "day_wrap",
        "Log & handoff",
        "Log interactions, outcomes, and schedule follow-ups in CRM."
      );
      pushStep(day, allSteps, step);
    }

    day.totalMinutes = day.steps.reduce((s, st) => s + st.durationMinutes, 0);
  }

  return {
    weekStart: days[0]?.date ?? isoDate(weekStart),
    weekEnd: days[days.length - 1]?.date ?? isoDate(weekStart),
    workDays,
    dayStartHour,
    dayEndHour,
    bufferMinutes,
    minutesPerDay: outreachPerDay,
    days: days.filter((day) => day.steps.length > 0),
    steps: allSteps,
  };
}

function makeStep(
  day: CalendarDay,
  stepIndex: number,
  startClock: number,
  duration: number,
  kind: CalendarStepKind,
  title: string,
  detail: string,
  item?: QueueItem
): CalendarStep {
  return {
    stepIndex,
    date: day.date,
    dayLabel: day.dayLabel,
    weekday: day.weekday,
    startTime: formatTime(startClock),
    endTime: formatTime(startClock + duration),
    durationMinutes: duration,
    kind,
    title,
    detail,
    constituentId: item?.constituentId,
    constituentName: item?.constituentName,
    action: item?.recommendedAction,
    channel: item?.channel,
    expectedOpportunity: item?.expectedOpportunity,
    whyNow: item?.whyNow,
  };
}

function pushStep(day: CalendarDay, allSteps: CalendarStep[], step: CalendarStep) {
  day.steps.push(step);
  allSteps.push(step);
}

function mondayOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}
