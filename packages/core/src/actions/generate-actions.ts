import type { ActionType, BuildTuesdayInput, ConstituentProfile } from "../models/types";
import type { EvidenceSignal, FundraisingAction } from "../models/action-model";
import { isSolicitationAction } from "../models/action-model";
import { checkEligibility, resolveChannel } from "./eligibility";
import { ACTION_MINUTES, ACTION_LABELS, channelMinutes } from "./action-config";
import { estimateOpportunity } from "../opportunity/estimates";
import { combinedActionWeight } from "./weights";
import { safeGiftAmountLabel } from "../privacy/gift-privacy";

const ALL_ACTION_TYPES: ActionType[] = [
  "thank_you",
  "stewardship_message",
  "renewal_ask",
  "upgrade_ask",
  "recurring_gift_ask",
  "event_invitation",
  "personal_call",
  "reactivation_email",
  "reunion_outreach",
  "data_quality_task",
  "no_action",
];

export function generateCandidateActions(
  profile: ConstituentProfile,
  input: BuildTuesdayInput
): FundraisingAction[] {
  if (profile.deceased) return [];

  const eligibility = checkEligibility(profile, input.channels);
  const actions: FundraisingAction[] = [];

  for (const actionType of ALL_ACTION_TYPES) {
    const elig = eligibility[actionType];
    const exclusionReasons: string[] = [];
    if (!elig.eligible && elig.reason) exclusionReasons.push(elig.reason);

    const channel = resolveChannel(actionType, profile, input.channels);
    if (
      !elig.eligible ||
      (channel === "none" &&
        actionType !== "no_action" &&
        actionType !== "data_quality_task")
    ) {
      if (actionType !== "no_action") continue;
    }

    if (profile.doNotSolicit && isSolicitationAction(actionType)) continue;

    const fit = actionFit(profile, actionType);
    const urgency = actionUrgency(profile, actionType, input.objective);
    const relationshipFit = relationshipFitScore(profile, actionType, input.riskPreference);
    const opp = estimateOpportunity(profile, actionType);
    const weight = combinedActionWeight(
      input.objective,
      input.riskPreference,
      input.strategyId ?? null,
      actionType
    );
    const score =
      opp.expected * profile.confidence * relationshipFit * urgency * fit * weight;

    const minutes =
      actionType === "no_action"
        ? 0
        : channelMinutes(channel === "none" ? "email" : channel, ACTION_MINUTES[actionType]);

    const { whyNow, evidence, suggestedMessage, warning } = buildExplanation(
      profile,
      actionType
    );

    const priorityScore =
      (opp.expected * profile.confidence * relationshipFit * urgency) / Math.max(minutes, 1);

    actions.push({
      id: `${profile.id}:${actionType}:${channel}`,
      constituentId: profile.id,
      constituentName: profile.displayName,
      actionType,
      channel,
      estimatedMinutes: minutes,
      conservativeOpportunity: opp.conservative,
      expectedOpportunity: opp.expected,
      upsideOpportunity: opp.upside,
      confidence: profile.confidence,
      relationshipFit,
      urgency,
      priorityScore,
      evidence: evidence.map((label, i) => ({ code: `e${i}`, label })),
      prerequisites: prerequisitesFor(profile, actionType),
      exclusionReasons,
      downstreamEffects: downstreamEffects(profile, actionType),
      whyNow,
      suggestedMessage,
      warning,
    });
  }

  actions.sort((a, b) => tieBreakActions(b, a));
  return actions;
}

export function selectBestFundraisingAction(
  profile: ConstituentProfile,
  input: BuildTuesdayInput
): FundraisingAction | null {
  const candidates = generateCandidateActions(profile, input).filter(
    (a) => a.actionType !== "no_action" && a.estimatedMinutes > 0
  );
  return candidates[0] ?? null;
}

/** Deterministic ordering: priorityScore desc, then constituentId, then actionType */
export function tieBreakActions(a: FundraisingAction, b: FundraisingAction): number {
  if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
  if (a.constituentId !== b.constituentId) return a.constituentId.localeCompare(b.constituentId);
  return a.actionType.localeCompare(b.actionType);
}

function actionFit(profile: ConstituentProfile, action: ActionType): number {
  const s = profile.scores;
  switch (action) {
    case "renewal_ask":
    case "personal_call":
      return 0.4 + s.renewal * 0.6;
    case "upgrade_ask":
      return 0.4 + s.upgrade * 0.6;
    case "recurring_gift_ask":
      return 0.4 + s.recurring * 0.6;
    case "reactivation_email":
    case "reunion_outreach":
      return 0.4 + s.reactivation * 0.6;
    case "event_invitation":
      return 0.4 + s.eventAffinity * 0.6;
    case "thank_you":
    case "stewardship_message":
      return 0.4 + s.stewardshipUrgency * 0.6;
    case "data_quality_task":
      return 0.3 + s.dataQuality * 0.7;
    default:
      return 0.1;
  }
}

function actionUrgency(
  profile: ConstituentProfile,
  action: ActionType,
  objective: BuildTuesdayInput["objective"]
): number {
  if (profile.labels.includes("lybunt") && (action === "renewal_ask" || action === "personal_call")) {
    return 1.15;
  }
  if (profile.recentCareerUpdate && action === "upgrade_ask") return 1.1;
  if (objective === "fill_an_event" && profile.eventCount > 0) return 1.1;
  if (profile.daysSinceLastInteraction !== null && profile.daysSinceLastInteraction > 540) {
    return 1.05;
  }
  return 1;
}

function relationshipFitScore(
  profile: ConstituentProfile,
  action: ActionType,
  risk: BuildTuesdayInput["riskPreference"]
): number {
  if (profile.gaveCurrentYear && (action === "upgrade_ask" || action === "renewal_ask")) {
    return risk === "relationship_focused" ? 0.4 : 0.65;
  }
  if (profile.labels.includes("first_time_donor") && action === "upgrade_ask") return 0.2;
  if (action === "thank_you" || action === "stewardship_message") return 1.1;
  if (action === "no_action") return 0.5;
  return 1;
}

function prerequisitesFor(profile: ConstituentProfile, action: ActionType): string[] {
  const pre: string[] = [];
  if (action === "renewal_ask" || action === "personal_call") {
    pre.push("Prior donor with contact channel");
  }
  if (action === "thank_you" || action === "stewardship_message") {
    pre.push("Recent or current-year gift preferred");
  }
  if (profile.gaveCurrentYear && isSolicitationAction(action)) {
    pre.push("Stewardship window may be required first");
  }
  return pre;
}

function downstreamEffects(profile: ConstituentProfile, action: ActionType) {
  const effects: FundraisingAction["downstreamEffects"] = {};
  if (action === "thank_you" || action === "stewardship_message" || action === "renewal_ask") {
    effects.retentionImpact = profile.labels.includes("lybunt") ? 0.85 : 0.5;
  }
  if (action === "recurring_gift_ask") effects.recurringPotential = 0.7;
  if (action === "personal_call" || action === "stewardship_message") {
    effects.pipelineImpact = 0.6;
  }
  return effects;
}

function buildExplanation(profile: ConstituentProfile, action: ActionType): {
  whyNow: string;
  evidence: string[];
  suggestedMessage: string;
  warning: string | null;
} {
  const evidence: string[] = [];
  for (const label of profile.labels.slice(0, 4)) {
    evidence.push(label.replace(/_/g, " ").toUpperCase());
  }
  if (profile.mostRecentGiftDate) {
    evidence.push(`Last gift ${safeGiftAmountLabel(profile)} on ${profile.mostRecentGiftDate.slice(0, 10)}`);
  }
  if (profile.eventCount > 0) evidence.push(`${profile.eventCount} event(s) attended`);
  if (profile.staleAskAmount) {
    evidence.push(`Repeat ask amount $${profile.staleAskAmount.toFixed(0)} in interactions`);
  }

  let whyNow = "Routine portfolio review.";
  if (profile.labels.includes("lybunt")) {
    whyNow = "Gave last fiscal year but not yet this year — renewal window.";
  } else if (profile.gaveCurrentYear && profile.labels.includes("first_time_donor")) {
    whyNow = "Recent first gift — stewardship before next ask.";
  } else if (profile.labels.includes("sybunt")) {
    whyNow = "Lapsed donor with prior commitment — reactivation timing.";
  } else if (profile.dataQualityFlags.length > 0) {
    whyNow = "Contact gaps block reliable outreach.";
  }

  const name = profile.firstName || profile.displayName;
  const amountHint = safeGiftAmountLabel(profile);
  const suggestedMessage =
    action === "thank_you"
      ? `Thank ${name} for their recent support and share impact.`
      : action === "renewal_ask"
        ? `Ask ${name} to renew (reference: ${amountHint}).`
        : action === "upgrade_ask"
          ? `Discuss increasing support given ${profile.consecutiveGivingYears} years of giving.`
          : action === "recurring_gift_ask"
            ? `Invite ${name} to convert annual giving to monthly recurring.`
            : action === "event_invitation"
              ? `Invite to upcoming event based on past attendance.`
              : action === "data_quality_task"
                ? `Confirm best email/phone before solicitation.`
                : action === "no_action"
                  ? `Hold solicitation — relationship or data constraints.`
                  : `${ACTION_LABELS[action]} for ${name}.`;

  let warning: string | null = null;
  if (profile.doNotSolicit) warning = "Do not solicit flag on record.";
  else if (profile.gaveCurrentYear && isSolicitationAction(action)) {
    warning = "Already gave this fiscal year — prefer stewardship.";
  } else if (!profile.canEmail && !profile.canPhone) {
    warning = "Missing contact information.";
  }

  return { whyNow, evidence, suggestedMessage, warning };
}
