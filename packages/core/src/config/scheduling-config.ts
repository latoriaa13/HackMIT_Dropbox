import type { ActionType } from "../models/types";

/** Default scheduling preferences for calendar-aware planning. */
export const DEFAULT_SCHEDULING_PREFERENCES = {
  timezone: "America/New_York",
  workingHoursStart: 9,
  workingHoursEnd: 17,
  lunchStartHour: 12,
  lunchEndHour: 13,
  bufferBetweenTasksMinutes: 15,
  gapAfterIntensiveCallMinutes: 15,
  reserveBufferMinutes: 30,
  workDays: 5,
} as const;

export type SchedulingPreferences = {
  timezone: string;
  workingHoursStart: number;
  workingHoursEnd: number;
  lunchStartHour: number;
  lunchEndHour: number;
  bufferBetweenTasksMinutes: number;
  gapAfterIntensiveCallMinutes: number;
  reserveBufferMinutes: number;
  workDays: number;
};

/** Configurable default durations for schedulable fundraising tasks (minutes). */
export const SCHEDULING_ACTION_MINUTES: Record<ActionType, number> = {
  personal_call: 30,
  renewal_ask: 30,
  upgrade_ask: 45,
  thank_you: 15,
  stewardship_message: 15,
  event_invitation: 15,
  data_quality_task: 10,
  reactivation_email: 15,
  reunion_outreach: 15,
  recurring_gift_ask: 15,
  no_action: 0,
};

export const INTENSIVE_CALL_ACTIONS: ActionType[] = [
  "personal_call",
  "renewal_ask",
  "upgrade_ask",
];

export function isIntensiveCallAction(action: ActionType): boolean {
  return INTENSIVE_CALL_ACTIONS.includes(action);
}
