import type { BuildTuesdayInput, ConstituentProfile } from "../models/types";
import type { FundraisingAction } from "../models/action-model";
import { generateCandidateActions } from "../actions/generate-actions";
import { safeGiftAmountLabel } from "../privacy/gift-privacy";

export type DetailedExplanation = {
  recommendedAction: string;
  whyThisPerson: string[];
  whyThisAction: string;
  whyNow: string;
  whyNotAlternatives: string[];
  missingEvidence: string[];
  whatWouldChange: string[];
  confidenceLevel: "high" | "medium" | "low";
  confidenceReason: string;
  scoreBreakdown: Record<string, number>;
};

export function buildDetailedExplanation(
  profile: ConstituentProfile,
  input: BuildTuesdayInput,
  selected?: FundraisingAction
): DetailedExplanation {
  const options = generateCandidateActions(profile, input).filter(
    (a) => a.actionType !== "no_action"
  );
  const best = selected ?? options[0];
  const actionLabel = best?.actionType ?? "no_action";

  const whyThisPerson: string[] = [];
  if (profile.consecutiveGivingYears >= 3) {
    whyThisPerson.push(`${profile.consecutiveGivingYears} consecutive giving years observed`);
  }
  if (profile.labels.includes("lybunt")) {
    whyThisPerson.push("Gave in prior fiscal year but not yet this year (LYBUNT)");
  }
  if (profile.gaveCurrentYear) whyThisPerson.push("Has a current fiscal year gift on record");
  if (profile.eventCount > 0) whyThisPerson.push(`${profile.eventCount} event attendance record(s)`);
  if (profile.daysSinceLastInteraction !== null) {
    whyThisPerson.push(`Last interaction ${profile.daysSinceLastInteraction} days ago`);
  }

  const whyNotAlternatives: string[] = [];
  const upgrade = options.find((o) => o.actionType === "upgrade_ask");
  if (upgrade && best && best.actionType !== "upgrade_ask") {
    if (profile.amountTrend < 0) {
      whyNotAlternatives.push("Why not upgrade: gift trend is flat or declining.");
    } else if (profile.gaveCurrentYear) {
      whyNotAlternatives.push("Why not upgrade: stewardship window after current-year gift.");
    } else if (profile.labels.includes("first_time_donor")) {
      whyNotAlternatives.push("Why not upgrade: first-time donor — nurture before upgrade.");
    }
  }
  const renewal = options.find((o) => o.actionType === "renewal_ask");
  if (renewal && best && best.actionType !== "renewal_ask" && profile.gaveCurrentYear) {
    whyNotAlternatives.push("Why not renewal ask: already renewed this fiscal year.");
  }

  const missingEvidence: string[] = [];
  if (profile.eventCount === 0) missingEvidence.push("No recent event attendance in dataset");
  if (!profile.canPhone) missingEvidence.push("Phone status not available for call actions");
  if (profile.activityNames.length === 0) missingEvidence.push("No activities listed for affinity targeting");

  const whatWouldChange: string[] = [];
  if (!profile.canEmail) whatWouldChange.push("Deliverable email would enable email reactivation");
  if (profile.labels.includes("lybunt") && profile.gaveCurrentYear) {
    whatWouldChange.push("A current-year gift would shift recommendation to stewardship");
  }

  const confidenceLevel =
    profile.confidence >= 0.75 ? "high" : profile.confidence >= 0.5 ? "medium" : "low";

  return {
    recommendedAction: actionLabel,
    whyThisPerson,
    whyThisAction: best?.suggestedMessage ?? "No eligible action selected.",
    whyNow: best?.whyNow ?? "Insufficient eligible actions.",
    whyNotAlternatives,
    missingEvidence,
    whatWouldChange,
    confidenceLevel,
    confidenceReason: `${confidenceLevel} confidence — contact completeness and giving history depth (last gift: ${safeGiftAmountLabel(profile)}).`,
    scoreBreakdown: profile.scores as unknown as Record<string, number>,
  };
}
