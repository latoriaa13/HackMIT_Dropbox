import type { BuildTuesdayInput, QueueItem } from "../models/types";
import type { FundraisingAction } from "../models/action-model";
import { isSolicitationAction } from "../models/action-model";
import { tieBreakActions } from "../actions/generate-actions";
import { sumEstimates } from "../opportunity/estimates";

/**
 * Select a portfolio of actions (not people) under a minute budget.
 * At most one selected action per constituent. Deterministic tie-breaking.
 */
export function optimizeActionPortfolio(
  candidates: FundraisingAction[],
  input: BuildTuesdayInput
): { selected: FundraisingAction[]; minutesUsed: number } {
  const budgetMinutes = input.staffHours * 60;
  const sorted = [...candidates]
    .filter((a) => a.actionType !== "no_action" && a.estimatedMinutes > 0)
    .sort(tieBreakActions);

  const selected: FundraisingAction[] = [];
  const seenConstituents = new Set<string>();
  let minutesUsed = 0;

  for (const action of sorted) {
    if (seenConstituents.has(action.constituentId)) continue;
    if (minutesUsed + action.estimatedMinutes > budgetMinutes) continue;
    seenConstituents.add(action.constituentId);
    minutesUsed += action.estimatedMinutes;
    selected.push(action);
  }

  return { selected, minutesUsed };
}

export function fundraisingActionToQueueItem(action: FundraisingAction): QueueItem {
  return {
    constituentId: action.constituentId,
    constituentName: action.constituentName,
    recommendedAction: action.actionType,
    channel: action.channel,
    estimatedMinutes: action.estimatedMinutes,
    conservativeOpportunity: action.conservativeOpportunity,
    expectedOpportunity: action.expectedOpportunity,
    upsideOpportunity: action.upsideOpportunity,
    priorityScore: action.priorityScore,
    confidence: action.confidence,
    whyNow: action.whyNow,
    evidence: action.evidence.map((e) => e.label),
    suggestedMessage: action.suggestedMessage,
    warning: action.warning,
  };
}

export function summarizePortfolio(selected: FundraisingAction[]) {
  const totals = sumEstimates(
    selected.map((a) => ({
      conservative: a.conservativeOpportunity,
      expected: a.expectedOpportunity,
      upside: a.upsideOpportunity,
    }))
  );

  let phone = 0;
  let email = 0;
  let eventInv = 0;
  let stewardship = 0;
  let solicitation = 0;
  let renewalRiskAddressed = 0;
  let relationshipWarnings = 0;
  let highConfidence = 0;

  for (const a of selected) {
    if (a.channel === "phone") phone++;
    if (a.channel === "email") email++;
    if (a.channel === "event_invitation") eventInv++;
    if (
      a.actionType === "thank_you" ||
      a.actionType === "stewardship_message" ||
      a.channel === "stewardship_message"
    ) {
      stewardship++;
    }
    if (isSolicitationAction(a.actionType)) solicitation++;
    if (
      a.actionType === "renewal_ask" ||
      a.actionType === "thank_you" ||
      a.actionType === "stewardship_message"
    ) {
      if (a.evidence.some((e) => e.label.includes("LYBUNT"))) renewalRiskAddressed++;
    }
    if (a.warning) relationshipWarnings++;
    if (a.confidence >= 0.75) highConfidence++;
  }

  return {
    totals,
    actionCount: selected.length,
    constituentCount: new Set(selected.map((a) => a.constituentId)).size,
    phoneActions: phone,
    emailActions: email,
    eventInvitations: eventInv,
    stewardshipActions: stewardship,
    solicitationActions: solicitation,
    renewalRiskAddressed,
    relationshipRiskWarnings: relationshipWarnings,
    highConfidencePct: selected.length ? highConfidence / selected.length : 0,
  };
}
