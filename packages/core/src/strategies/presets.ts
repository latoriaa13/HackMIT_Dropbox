import type {
  BuildTuesdayInput,
  FundraisingObjective,
  RiskPreference,
  StrategyPresetId,
} from "../models/types";

export type { StrategyPresetId };

export type StrategyPreset = {
  id: StrategyPresetId;
  label: string;
  description: string;
  mappedObjective: FundraisingObjective;
  defaultRisk: RiskPreference;
  whyStrategyBullets: string[];
};

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "maximize_immediate_dollars",
    label: "Maximize immediate dollars",
    description: "Prioritize renewal and upgrade conversations with the highest planning opportunity.",
    mappedObjective: "maximize_near_term_dollars",
    defaultRisk: "revenue_focused",
    whyStrategyBullets: [
      "Weights upgrade and renewal asks more heavily",
      "Accepts higher relationship risk for near-term planning opportunity",
    ],
  },
  {
    id: "protect_donor_retention",
    label: "Protect donor retention",
    description: "Focus on LYBUNT renewal risk, stewardship, and gratitude before new asks.",
    mappedObjective: "protect_renewals",
    defaultRisk: "relationship_focused",
    whyStrategyBullets: [
      "Elevates stewardship and renewal calls for lapsed-this-year donors",
      "Penalizes aggressive upgrades when engagement is flat",
    ],
  },
  {
    id: "grow_recurring_giving",
    label: "Grow recurring giving",
    description: "Convert annual givers into recurring commitments.",
    mappedObjective: "grow_recurring",
    defaultRisk: "balanced",
    whyStrategyBullets: [
      "Targets recurring-gift candidates without active recurring_parent gifts",
      "Pairs invitations with stewardship for recent donors",
    ],
  },
  {
    id: "reactivate_lapsed",
    label: "Reactivate lapsed donors",
    description: "SYBUNT and long-lapsed portfolios with reactivation outreach.",
    mappedObjective: "reactivate_lapsed",
    defaultRisk: "balanced",
    whyStrategyBullets: [
      "Prioritizes reactivation email and reunion-style outreach",
      "Uses historical gift levels for planning estimates only",
    ],
  },
  {
    id: "fill_an_event",
    label: "Fill an event",
    description: "Event invitations for constituents with prior attendance affinity.",
    mappedObjective: "fill_an_event",
    defaultRisk: "balanced",
    whyStrategyBullets: [
      "Elevates event invitations for engaged non-donors and past attendees",
      "Does not invent event interest absent attendance history",
    ],
  },
  {
    id: "major_gift_pipeline",
    label: "Build future major-gift pipeline",
    description: "Relationship-first cultivation: calls, stewardship, and long-horizon pipeline impact.",
    mappedObjective: "protect_renewals",
    defaultRisk: "relationship_focused",
    whyStrategyBullets: [
      "Emphasizes personal calls and stewardship over immediate asks",
      "Scores pipelineImpact on cultivation actions (planning metric, not causal revenue)",
    ],
  },
  {
    id: "balanced_portfolio",
    label: "Balanced portfolio",
    description: "Blend renewal protection, modest opportunity, and relationship care.",
    mappedObjective: "protect_renewals",
    defaultRisk: "balanced",
    whyStrategyBullets: [
      "Moderate weights across renewal, stewardship, and selective reactivation",
      "Useful when no single objective dominates the week",
    ],
  },
];

export function presetToBuildInput(
  presetId: StrategyPresetId,
  staffHours: number,
  channels: BuildTuesdayInput["channels"],
  riskPreference?: RiskPreference
): BuildTuesdayInput & { strategyId: StrategyPresetId } {
  const preset = STRATEGY_PRESETS.find((p) => p.id === presetId)!;
  return {
    strategyId: presetId,
    objective: preset.mappedObjective,
    staffHours,
    channels,
    riskPreference: riskPreference ?? preset.defaultRisk,
  };
}

export function getPreset(id: StrategyPresetId): StrategyPreset {
  return STRATEGY_PRESETS.find((p) => p.id === id)!;
}
