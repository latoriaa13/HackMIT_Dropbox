import type { ConstituentProfile, OpportunityScores } from "../models/types";

export function computeScores(
  profile: Pick<
    ConstituentProfile,
    | "labels"
    | "gaveCurrentYear"
    | "gavePriorYear"
    | "lifetimeGiving"
    | "mostRecentGiftAmount"
    | "amountTrend"
    | "eventCount"
    | "hasRecurringGift"
    | "yearsSinceLastGift"
    | "dataQualityFlags"
    | "canEmail"
    | "canPhone"
    | "paidGiftCount"
    | "givingYearCount"
    | "daysSinceLastInteraction"
  >
): OpportunityScores {
  const l = profile.labels;
  const renewal = clamp(
    (l.includes("lybunt") ? 0.95 : 0) +
      (l.includes("renewal_candidate") && !l.includes("lybunt") ? 0.5 : 0) +
      (profile.gavePriorYear && !profile.gaveCurrentYear ? 0.4 : 0)
  );

  const upgrade = clamp(
    (l.includes("upgrade_candidate") ? 0.75 : 0) +
      (profile.amountTrend > 0 ? 0.15 : 0) +
      (profile.lifetimeGiving >= 2000 ? 0.1 : 0)
  );

  const recurring = clamp(
    (l.includes("recurring_candidate") && !profile.hasRecurringGift ? 0.8 : 0) +
      (profile.hasRecurringGift ? 0.2 : 0)
  );

  const reactivation = clamp(
    (l.includes("reactivation_candidate") ? 0.85 : 0) +
      (l.includes("long_lapsed") ? 0.1 : 0) +
      ((profile.yearsSinceLastGift ?? 0) >= 3 ? 0.05 : 0)
  );

  const eventAffinity = clamp(
    (profile.eventCount > 0 ? 0.5 + Math.min(profile.eventCount, 3) * 0.15 : 0) +
      (l.includes("event_affinity_candidate") ? 0.3 : 0)
  );

  const stewardshipUrgency = clamp(
    (profile.gaveCurrentYear ? 0.7 : 0) +
      (l.includes("first_time_donor") && profile.gaveCurrentYear ? 0.25 : 0)
  );

  const dataQuality = clamp(
    profile.dataQualityFlags.length * 0.2 +
      (!profile.canEmail && !profile.canPhone ? 0.5 : 0) +
      (!profile.canEmail ? 0.15 : 0)
  );

  return {
    renewal,
    upgrade,
    recurring,
    reactivation,
    eventAffinity,
    stewardshipUrgency,
    dataQuality,
  };
}

export function computeConfidence(
  profile: Pick<
    ConstituentProfile,
    | "paidGiftCount"
    | "givingYearCount"
    | "canEmail"
    | "canPhone"
    | "dataQualityFlags"
    | "daysSinceLastInteraction"
    | "deceased"
    | "doNotSolicit"
  >
): number {
  let c = 0.35;
  if (profile.paidGiftCount > 0) c += 0.25;
  if (profile.givingYearCount >= 2) c += 0.15;
  if (profile.canEmail || profile.canPhone) c += 0.15;
  if (profile.dataQualityFlags.length === 0) c += 0.1;
  if (profile.daysSinceLastInteraction !== null && profile.daysSinceLastInteraction < 365) {
    c += 0.05;
  }
  if (profile.deceased || profile.doNotSolicit) c *= 0.2;
  return clamp(c);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}
