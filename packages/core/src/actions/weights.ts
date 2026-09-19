import type { ActionType, FundraisingObjective, RiskPreference } from "../models/types";
import type { StrategyPresetId } from "../models/types";

export const OBJECTIVE_ACTION_WEIGHT: Record<
  FundraisingObjective,
  Partial<Record<ActionType, number>>
> = {
  protect_renewals: {
    renewal_ask: 1.3,
    thank_you: 1.1,
    stewardship_message: 1.15,
    personal_call: 1.1,
  },
  maximize_near_term_dollars: {
    renewal_ask: 1.2,
    upgrade_ask: 1.25,
    personal_call: 1.15,
  },
  grow_recurring: {
    recurring_gift_ask: 1.4,
    stewardship_message: 1.05,
  },
  reactivate_lapsed: {
    reactivation_email: 1.35,
    personal_call: 1.2,
    reunion_outreach: 1.1,
  },
  fill_an_event: {
    event_invitation: 1.45,
    reunion_outreach: 1.2,
    stewardship_message: 1.05,
  },
};

export const RISK_PENALTY: Record<
  RiskPreference,
  Partial<Record<ActionType, number>>
> = {
  revenue_focused: { upgrade_ask: 1.1, renewal_ask: 1.05 },
  balanced: {},
  relationship_focused: {
    thank_you: 1.25,
    stewardship_message: 1.2,
    upgrade_ask: 0.75,
    renewal_ask: 0.95,
  },
};

/** Extra multipliers per strategy preset (applied on top of mapped objective). */
export const STRATEGY_ACTION_WEIGHT: Record<
  StrategyPresetId,
  Partial<Record<ActionType, number>>
> = {
  maximize_immediate_dollars: { upgrade_ask: 1.15, renewal_ask: 1.1 },
  protect_donor_retention: { stewardship_message: 1.2, thank_you: 1.15, renewal_ask: 1.25 },
  grow_recurring_giving: { recurring_gift_ask: 1.35 },
  reactivate_lapsed: { reactivation_email: 1.2, reunion_outreach: 1.15 },
  fill_an_event: { event_invitation: 1.3 },
  major_gift_pipeline: {
    personal_call: 1.25,
    stewardship_message: 1.2,
    upgrade_ask: 1.05,
  },
  balanced_portfolio: {
    thank_you: 1.08,
    renewal_ask: 1.08,
    stewardship_message: 1.08,
    reactivation_email: 1.05,
  },
};

export function combinedActionWeight(
  objective: FundraisingObjective,
  risk: RiskPreference,
  strategyId: StrategyPresetId | null,
  action: ActionType
): number {
  const o = OBJECTIVE_ACTION_WEIGHT[objective][action] ?? 1;
  const r = RISK_PENALTY[risk][action] ?? 1;
  const s = strategyId ? (STRATEGY_ACTION_WEIGHT[strategyId][action] ?? 1) : 1;
  return o * r * s;
}
