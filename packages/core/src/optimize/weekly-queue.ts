import type {
  BuildTuesdayInput,
  ConstituentProfile,
  QueueItem,
  RecommendedAction,
} from "../models/types";
import type { FundraisingAction } from "../models/action-model";
import { generateCandidateActions, selectBestFundraisingAction } from "../actions/generate-actions";
import { selectBestAction } from "../actions/select-action";
import { sumEstimates } from "../opportunity/estimates";
import {
  optimizeActionPortfolio,
  fundraisingActionToQueueItem,
  summarizePortfolio,
} from "./portfolio-optimizer";

export type CandidateItem = {
  profile: ConstituentProfile;
  recommendation: RecommendedAction;
};

export function buildAllActionCandidates(
  profiles: ConstituentProfile[],
  input: BuildTuesdayInput
): FundraisingAction[] {
  const actions: FundraisingAction[] = [];
  for (const profile of profiles) {
    if (profile.deceased) continue;
    const best = selectBestFundraisingAction(profile, input);
    if (best) actions.push(best);
  }
  return actions;
}

export function buildCandidates(
  profiles: ConstituentProfile[],
  input: BuildTuesdayInput
): CandidateItem[] {
  const items: CandidateItem[] = [];
  for (const profile of profiles) {
    if (profile.deceased) continue;
    const recommendation = selectBestAction(profile, input);
    if (recommendation.action === "no_action" && recommendation.opportunity.expected === 0) {
      continue;
    }
    items.push({ profile, recommendation });
  }
  items.sort((a, b) => b.recommendation.priorityScore - a.recommendation.priorityScore);
  return items;
}

export function optimizeQueue(
  candidates: CandidateItem[],
  input: BuildTuesdayInput
): { items: QueueItem[]; minutesUsed: number } {
  const actions: FundraisingAction[] = candidates.map(({ profile, recommendation }) => ({
    id: `${profile.id}:${recommendation.action}`,
    constituentId: profile.id,
    constituentName: profile.displayName,
    actionType: recommendation.action,
    channel: recommendation.channel,
    estimatedMinutes: recommendation.estimatedMinutes,
    conservativeOpportunity: recommendation.opportunity.conservative,
    expectedOpportunity: recommendation.opportunity.expected,
    upsideOpportunity: recommendation.opportunity.upside,
    confidence: recommendation.confidence,
    relationshipFit: recommendation.relationshipFit,
    urgency: recommendation.urgency,
    priorityScore: recommendation.priorityScore,
    evidence: recommendation.evidence.map((label, i) => ({ code: `e${i}`, label })),
    prerequisites: [],
    exclusionReasons: [],
    downstreamEffects: {},
    whyNow: recommendation.whyNow,
    suggestedMessage: recommendation.suggestedMessage,
    warning: recommendation.warning,
  }));

  const { selected, minutesUsed } = optimizeActionPortfolio(actions, input);
  return {
    items: selected.map(fundraisingActionToQueueItem),
    minutesUsed,
  };
}

export function buildPortfolioFromProfiles(
  profiles: ConstituentProfile[],
  input: BuildTuesdayInput
) {
  const candidates = buildAllActionCandidates(profiles, input);
  const { selected, minutesUsed } = optimizeActionPortfolio(candidates, input);
  const summary = summarizePortfolio(selected);
  return {
    actions: selected,
    items: selected.map(fundraisingActionToQueueItem),
    minutesUsed,
    minutesBudget: input.staffHours * 60,
    candidateCount: candidates.length,
    summary,
  };
}

export function toQueueItem(
  profile: ConstituentProfile,
  recommendation: RecommendedAction
): QueueItem {
  return {
    constituentId: profile.id,
    constituentName: profile.displayName,
    recommendedAction: recommendation.action,
    channel: recommendation.channel,
    estimatedMinutes: recommendation.estimatedMinutes,
    conservativeOpportunity: recommendation.opportunity.conservative,
    expectedOpportunity: recommendation.opportunity.expected,
    upsideOpportunity: recommendation.opportunity.upside,
    priorityScore: recommendation.priorityScore,
    confidence: recommendation.confidence,
    whyNow: recommendation.whyNow,
    evidence: recommendation.evidence,
    suggestedMessage: recommendation.suggestedMessage,
    warning: recommendation.warning,
  };
}

export function queueTotals(items: QueueItem[]) {
  return sumEstimates(
    items.map((i) => ({
      conservative: i.conservativeOpportunity,
      expected: i.expectedOpportunity,
      upside: i.upsideOpportunity,
    }))
  );
}

export { generateCandidateActions, summarizePortfolio };
