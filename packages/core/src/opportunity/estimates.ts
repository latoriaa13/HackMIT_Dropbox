import type { ActionType, ConstituentProfile, OpportunityEstimate } from "../models/types";

export function estimateOpportunity(
  profile: Pick<
    ConstituentProfile,
    | "mostRecentGiftAmount"
    | "averageGift"
    | "lifetimeGiving"
    | "labels"
    | "gaveCurrentYear"
  >,
  action: ActionType
): OpportunityEstimate {
  const last = profile.mostRecentGiftAmount ?? profile.averageGift ?? 0;
  const avg = profile.averageGift ?? last;

  if (
    action === "thank_you" ||
    action === "stewardship_message" ||
    action === "data_quality_task" ||
    action === "no_action"
  ) {
    return { conservative: 0, expected: 0, upside: profile.gaveCurrentYear ? avg * 0.15 : 0 };
  }

  if (action === "event_invitation" || action === "reunion_outreach") {
    const base = Math.max(50, avg * 0.5);
    return { conservative: 0, expected: base * 0.3, upside: base };
  }

  if (action === "reactivation_email") {
    return {
      conservative: last * 0.25,
      expected: last * 0.5,
      upside: Math.max(last, avg),
    };
  }

  if (action === "recurring_gift_ask") {
    const monthly = Math.max(10, Math.round(avg / 12));
    return {
      conservative: monthly * 6,
      expected: monthly * 12,
      upside: monthly * 24,
    };
  }

  if (action === "upgrade_ask") {
    return {
      conservative: last,
      expected: last * 1.15,
      upside: last * 1.35,
    };
  }

  // renewal, personal_call, renewal_ask default
  return {
    conservative: last || avg * 0.5,
    expected: last || avg,
    upside: Math.max(last * 1.2, avg * 1.1),
  };
}

export function sumEstimates(items: OpportunityEstimate[]): OpportunityEstimate {
  return items.reduce(
    (acc, o) => ({
      conservative: acc.conservative + o.conservative,
      expected: acc.expected + o.expected,
      upside: acc.upside + o.upside,
    }),
    { conservative: 0, expected: 0, upside: 0 }
  );
}
