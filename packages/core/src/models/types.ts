import { z } from "zod";

export const FundraisingObjectiveSchema = z.enum([
  "protect_renewals",
  "maximize_near_term_dollars",
  "grow_recurring",
  "reactivate_lapsed",
  "fill_an_event",
]);
export type FundraisingObjective = z.infer<typeof FundraisingObjectiveSchema>;

export type StrategyPresetId =
  | "maximize_immediate_dollars"
  | "protect_donor_retention"
  | "grow_recurring_giving"
  | "reactivate_lapsed"
  | "fill_an_event"
  | "major_gift_pipeline"
  | "balanced_portfolio";

export const RiskPreferenceSchema = z.enum([
  "revenue_focused",
  "balanced",
  "relationship_focused",
]);
export type RiskPreference = z.infer<typeof RiskPreferenceSchema>;

export const ChannelSchema = z.enum([
  "phone",
  "email",
  "event_invitation",
  "stewardship_message",
]);
export type Channel = z.infer<typeof ChannelSchema>;

export const ActionTypeSchema = z.enum([
  "thank_you",
  "renewal_ask",
  "upgrade_ask",
  "recurring_gift_ask",
  "event_invitation",
  "personal_call",
  "stewardship_message",
  "reactivation_email",
  "reunion_outreach",
  "data_quality_task",
  "no_action",
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export type DerivedLabel =
  | "first_time_donor"
  | "repeat_donor"
  | "loyal_donor"
  | "lybunt"
  | "sybunt"
  | "long_lapsed"
  | "renewal_candidate"
  | "upgrade_candidate"
  | "recurring_candidate"
  | "reactivation_candidate"
  | "stewardship_candidate"
  | "event_affinity_candidate"
  | "data_quality_problem"
  | "never_donor";

export type OpportunityScores = {
  renewal: number;
  upgrade: number;
  recurring: number;
  reactivation: number;
  eventAffinity: number;
  stewardshipUrgency: number;
  dataQuality: number;
};

export type GiftSummary = {
  id: string;
  giftDate: string;
  amount: number;
  fiscalYear: number;
  giftType: string;
  status: string;
  campaignId: string | null;
  anonymous: boolean;
};

export type InteractionSummary = {
  id: string;
  occurredAt: string;
  interactionType: string;
  askAmount: number | null;
  purpose: string | null;
  outcome: string | null;
};

export type EventSummary = {
  eventId: string;
  eventName: string;
  attendedAt: string;
  startsAt: string;
  city: string | null;
};

export type ConstituentProfile = {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  city: string | null;
  state: string | null;
  classYear: number | null;
  primaryEmail: string | null;
  emailStatus: string;
  phoneStatus: string;
  doNotSolicit: boolean;
  deceased: boolean;
  assignedStaffId: string | null;
  affiliationTypes: string[];
  activityNames: string[];
  dataQualityFlags: string[];
  canEmail: boolean;
  canPhone: boolean;
  gifts: GiftSummary[];
  paidGiftCount: number;
  lifetimeGiving: number;
  averageGift: number;
  largestGift: number;
  mostRecentGiftDate: string | null;
  mostRecentGiftAmount: number | null;
  lastGiftFiscalYear: number | null;
  givingYearCount: number;
  consecutiveGivingYears: number;
  yearsSinceLastGift: number | null;
  currentFiscalYearGiving: number;
  gaveCurrentYear: boolean;
  gavePriorYear: boolean;
  amountTrend: number;
  eventCount: number;
  events: EventSummary[];
  daysSinceLastInteraction: number | null;
  lastInteractionType: string | null;
  hasRecurringGift: boolean;
  staleAskAmount: number | null;
  recentCareerUpdate: boolean;
  labels: DerivedLabel[];
  scores: OpportunityScores;
  confidence: number;
};

export type OpportunityEstimate = {
  conservative: number;
  expected: number;
  upside: number;
};

export type RecommendedAction = {
  action: ActionType;
  channel: Channel | "none";
  estimatedMinutes: number;
  opportunity: OpportunityEstimate;
  priorityScore: number;
  confidence: number;
  relationshipFit: number;
  urgency: number;
  whyNow: string;
  evidence: string[];
  suggestedMessage: string;
  warning: string | null;
  ineligibleReasons: Record<ActionType, string | null>;
};

export type BuildTuesdayInput = {
  objective: FundraisingObjective;
  staffHours: number;
  channels: Channel[];
  riskPreference: RiskPreference;
  strategyId?: StrategyPresetId;
};

export type QueueItem = {
  constituentId: string;
  constituentName: string;
  recommendedAction: ActionType;
  channel: Channel | "none";
  estimatedMinutes: number;
  conservativeOpportunity: number;
  expectedOpportunity: number;
  upsideOpportunity: number;
  priorityScore: number;
  confidence: number;
  whyNow: string;
  evidence: string[];
  suggestedMessage: string;
  warning: string | null;
};

export type WeeklyCalendarRef = {
  weekStart: string;
  weekEnd: string;
  workDays: number;
  dayStartHour: number;
  dayEndHour: number;
  bufferMinutes: number;
  minutesPerDay: number;
  days: Array<{
    date: string;
    dayLabel: string;
    weekday: string;
    totalMinutes: number;
    steps: Array<{
      stepIndex: number;
      date: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      kind: string;
      title: string;
      detail: string;
      constituentId?: string;
      whyNow?: string;
    }>;
  }>;
  steps: unknown[];
};

export type BuildTuesdayResult = {
  items: QueueItem[];
  calendar: WeeklyCalendarRef;
  totals: OpportunityEstimate;
  minutesUsed: number;
  minutesBudget: number;
  candidateCount: number;
  config: {
    objective: FundraisingObjective;
    staffHours: number;
    channels: Channel[];
    riskPreference: RiskPreference;
    currentFiscalYear: number;
  };
};

export type TimelineEvent = {
  date: string;
  kind: "gift" | "event" | "interaction" | "milestone";
  label: string;
  detail: string;
  amount?: number;
};

export type SegmentQueryResult = {
  segmentName: string;
  description: string;
  count: number;
  sharedCharacteristics: string[];
  recommendedCampaign: string;
  opportunity: OpportunityEstimate;
  constituents: Array<{
    id: string;
    name: string;
    classYear: number | null;
    city: string | null;
    lifetimeGiving: number;
    labels: DerivedLabel[];
  }>;
  unsupportedSignals: string[];
};

export type TuesdayDatasetMeta = {
  schoolName: string;
  constituentCount: number;
  donorCount: number;
  lybuntCount: number;
  currentFiscalYear: number;
  generatedAt: string;
};

export type ProcessedDataset = {
  meta: TuesdayDatasetMeta;
  profiles: ConstituentProfile[];
  campaigns: Array<{ id: string; name: string; startsAt: string; status: string }>;
};

export const StrategyPresetIdSchema = z.enum([
  "maximize_immediate_dollars",
  "protect_donor_retention",
  "grow_recurring_giving",
  "reactivate_lapsed",
  "fill_an_event",
  "major_gift_pipeline",
  "balanced_portfolio",
]);

export const BuildTuesdayInputSchema = z.object({
  objective: FundraisingObjectiveSchema,
  staffHours: z.number().min(1).max(40),
  channels: z.array(ChannelSchema).min(1),
  riskPreference: RiskPreferenceSchema,
  strategyId: StrategyPresetIdSchema.optional(),
});
