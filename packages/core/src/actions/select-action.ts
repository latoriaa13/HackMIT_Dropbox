import type {
  BuildTuesdayInput,
  ConstituentProfile,
  RecommendedAction,
  ActionType,
} from "../models/types";
import { checkEligibility } from "./eligibility";
import {
  generateCandidateActions,
  selectBestFundraisingAction,
} from "./generate-actions";

export function selectBestAction(
  profile: ConstituentProfile,
  input: BuildTuesdayInput
): RecommendedAction {
  const eligibility = checkEligibility(profile, input.channels);
  const ineligibleReasons = Object.fromEntries(
    Object.entries(eligibility).map(([k, v]) => [k, v.reason])
  ) as Record<ActionType, string | null>;

  const best = selectBestFundraisingAction(profile, input);
  if (!best) {
    return {
      action: "no_action",
      channel: "none",
      estimatedMinutes: 0,
      opportunity: { conservative: 0, expected: 0, upside: 0 },
      confidence: profile.confidence,
      relationshipFit: 1,
      urgency: 0,
      priorityScore: 0,
      whyNow: "No eligible outreach within selected channels and constraints.",
      evidence: profile.dataQualityFlags,
      suggestedMessage: "Review record before outreach.",
      warning: profile.deceased ? "Deceased" : profile.doNotSolicit ? "Do not solicit" : null,
      ineligibleReasons,
    };
  }

  return {
    action: best.actionType,
    channel: best.channel,
    estimatedMinutes: best.estimatedMinutes,
    opportunity: {
      conservative: best.conservativeOpportunity,
      expected: best.expectedOpportunity,
      upside: best.upsideOpportunity,
    },
    confidence: best.confidence,
    relationshipFit: best.relationshipFit,
    urgency: best.urgency,
    priorityScore: best.priorityScore,
    whyNow: best.whyNow,
    evidence: best.evidence.map((e) => e.label),
    suggestedMessage: best.suggestedMessage,
    warning: best.warning,
    ineligibleReasons,
  };
}

/** All scored action options for explanation / journey modules */
export function listActionOptions(profile: ConstituentProfile, input: BuildTuesdayInput) {
  return generateCandidateActions(profile, input);
}
