import type { ActionType } from "../models/types";
import type { EvidenceSignal } from "../models/action-model";
import type { SchedulingPreferences } from "../config/scheduling-config";

export type RequiredChannel = "phone" | "email" | "planning" | "meeting";

export type SchedulingStatus =
  | "unscheduled"
  | "proposed"
  | "approved"
  | "denied"
  | "reschedule_requested"
  | "completed"
  | "failed";

export type SchedulableFundraisingTask = {
  id: string;
  constituentId: string;
  actionType: ActionType;
  title: string;
  description: string;
  estimatedMinutes: number;
  priority: number;
  expectedOpportunity: number;
  confidence: number;
  preferredTimeOfDay?: "morning" | "afternoon" | "any";
  requiredChannel: RequiredChannel;
  evidence: EvidenceSignal[];
  suggestedStart?: string;
  suggestedEnd?: string;
  whyNow: string;
  whyThisTime?: string;
  schedulingStatus: SchedulingStatus;
  hasCalendarConflict?: boolean;
  outlookDraftId?: string;
  outlookEventId?: string;
  conservativeOpportunity?: number;
  constituentName: string;
};

export type OutlookBusyBlock = {
  id: string;
  subject: string;
  start: string;
  end: string;
  location?: string;
  isAllDay?: boolean;
  showAs?: string;
  isPrivate?: boolean;
};

export type ScheduleBlockKind =
  | "outlook_event"
  | "free_block"
  | "fundraising_task"
  | "buffer"
  | "conflict";

export type ScheduleTimelineEntry = {
  id: string;
  kind: ScheduleBlockKind;
  date: string;
  start: string;
  end: string;
  label: string;
  detail?: string;
  taskId?: string;
  outlookEventId?: string;
  conflict?: boolean;
};

export type ScheduleSummary = {
  tasksProposed: number;
  tasksScheduled: number;
  tasksUnscheduled: number;
  scheduledMinutes: number;
  availableFundraisingMinutes: number;
  totalAvailableWorkMinutes: number;
  outlookMeetingCount: number;
  conservativeOpportunity: number;
  expectedOpportunity: number;
  conflictCount: number;
};

export type CalendarAwareSchedule = {
  weekStart: string;
  weekEnd: string;
  timezone: string;
  preferences: SchedulingPreferences;
  tasks: SchedulableFundraisingTask[];
  timeline: ScheduleTimelineEntry[];
  outlookEvents: OutlookBusyBlock[];
  summary: ScheduleSummary;
  generatedAt: string;
};
