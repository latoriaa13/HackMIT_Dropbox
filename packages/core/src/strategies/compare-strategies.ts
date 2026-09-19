import type { BuildTuesdayInput, OpportunityEstimate, ProcessedDataset } from "../models/types";
import type { StrategyPresetId } from "../models/types";
import { buildPortfolioFromProfiles } from "../optimize/weekly-queue";
import { STRATEGY_PRESETS, getPreset, presetToBuildInput } from "./presets";
import type { FundraisingAction } from "../models/action-model";

export type StrategyPlanSummary = {
  strategyId: StrategyPresetId;
  label: string;
  description: string;
  whyStrategy: string[];
  input: BuildTuesdayInput & { strategyId: StrategyPresetId };
  totals: OpportunityEstimate;
  minutesUsed: number;
  actionCount: number;
  constituentCount: number;
  phoneActions: number;
  emailActions: number;
  eventInvitations: number;
  stewardshipActions: number;
  solicitationActions: number;
  renewalRiskAddressed: number;
  relationshipRiskWarnings: number;
  highConfidencePct: number;
  /** Planning metric 0–1: stewardship + retention-tagged actions vs solicitations */
  retentionProtectionScore: number;
  actions: FundraisingAction[];
  items: ReturnType<typeof buildPortfolioFromProfiles>["items"];
};

export type StrategyComparisonResult = {
  plans: StrategyPlanSummary[];
  frontier: Array<{
    strategyId: StrategyPresetId;
    label: string;
    expectedOpportunity: number;
    retentionProtectionScore: number;
    minutesUsed: number;
  }>;
  pairwiseInsights: string[];
};

export function compareStrategies(
  dataset: ProcessedDataset,
  options: {
    staffHours: number;
    channels: BuildTuesdayInput["channels"];
    riskPreference?: BuildTuesdayInput["riskPreference"];
    strategyIds?: StrategyPresetId[];
  }
): StrategyComparisonResult {
  const ids =
    options.strategyIds ?? (STRATEGY_PRESETS.map((p) => p.id) as StrategyPresetId[]);

  const plans: StrategyPlanSummary[] = ids.map((strategyId) => {
    const preset = getPreset(strategyId);
    const input = presetToBuildInput(
      strategyId,
      options.staffHours,
      options.channels,
      options.riskPreference
    );
    const built = buildPortfolioFromProfiles(dataset.profiles, input);
    const s = built.summary;
    const retentionProtectionScore = computeRetentionScore(s.stewardshipActions, s.solicitationActions, s.renewalRiskAddressed, built.actions.length);

    return {
      strategyId,
      label: preset.label,
      description: preset.description,
      whyStrategy: preset.whyStrategyBullets,
      input,
      totals: s.totals,
      minutesUsed: built.minutesUsed,
      actionCount: s.actionCount,
      constituentCount: s.constituentCount,
      phoneActions: s.phoneActions,
      emailActions: s.emailActions,
      eventInvitations: s.eventInvitations,
      stewardshipActions: s.stewardshipActions,
      solicitationActions: s.solicitationActions,
      renewalRiskAddressed: s.renewalRiskAddressed,
      relationshipRiskWarnings: s.relationshipRiskWarnings,
      highConfidencePct: s.highConfidencePct,
      retentionProtectionScore,
      actions: built.actions,
      items: built.items,
    };
  });

  const frontier = plans.map((p) => ({
    strategyId: p.strategyId,
    label: p.label,
    expectedOpportunity: p.totals.expected,
    retentionProtectionScore: p.retentionProtectionScore,
    minutesUsed: p.minutesUsed,
  }));

  const pairwiseInsights = buildPairwiseInsights(plans);

  return { plans, frontier, pairwiseInsights };
}

function computeRetentionScore(
  stewardship: number,
  solicitation: number,
  renewalAddressed: number,
  total: number
): number {
  if (total === 0) return 0;
  const stewardshipRatio = stewardship / total;
  const renewalRatio = renewalAddressed / total;
  const solicitPenalty = solicitation / total;
  return Math.max(0, Math.min(1, stewardshipRatio * 0.5 + renewalRatio * 0.4 - solicitPenalty * 0.15 + 0.25));
}

function buildPairwiseInsights(plans: StrategyPlanSummary[]): string[] {
  const insights: string[] = [];
  const byRevenue = [...plans].sort((a, b) => b.totals.expected - a.totals.expected);
  const byRetention = [...plans].sort((a, b) => b.retentionProtectionScore - a.retentionProtectionScore);
  const topRev = byRevenue[0];
  const topRet = byRetention[0];
  if (topRev && topRet && topRev.strategyId !== topRet.strategyId) {
    const diff = topRev.totals.expected - byRevenue.find((p) => p.strategyId === topRet.strategyId)!.totals.expected;
    const renewalDiff = topRet.renewalRiskAddressed - topRev.renewalRiskAddressed;
    insights.push(
      `${topRet.label} gives up about $${Math.max(0, diff).toFixed(0)} in near-term planning opportunity compared with ${topRev.label}, but addresses ${Math.max(0, renewalDiff)} more renewal-risk relationships in this portfolio.`
    );
  }
  const balanced = plans.find((p) => p.strategyId === "balanced_portfolio");
  const revenue = plans.find((p) => p.strategyId === "maximize_immediate_dollars");
  if (balanced && revenue) {
    const oppDiff = revenue.totals.expected - balanced.totals.expected;
    const retDiff = balanced.renewalRiskAddressed - revenue.renewalRiskAddressed;
    if (oppDiff > 0 && retDiff > 0) {
      insights.push(
        `Balanced portfolio trades about $${oppDiff.toFixed(0)} expected planning opportunity for ${retDiff} additional renewal-risk touches vs revenue-first.`
      );
    }
  }
  return insights;
}

export function getStrategyPlan(
  dataset: ProcessedDataset,
  strategyId: StrategyPresetId,
  staffHours: number,
  channels: BuildTuesdayInput["channels"],
  riskPreference?: BuildTuesdayInput["riskPreference"]
): StrategyPlanSummary {
  return compareStrategies(dataset, {
    staffHours,
    channels,
    riskPreference,
    strategyIds: [strategyId],
  }).plans[0];
}
