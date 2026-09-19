import type { ConstituentProfile, DerivedLabel } from "../models/types";
import type { FiscalConfig } from "../config/fiscal-year";

export function deriveLabels(
  partial: Pick<
    ConstituentProfile,
    | "paidGiftCount"
    | "givingYearCount"
    | "gaveCurrentYear"
    | "gavePriorYear"
    | "yearsSinceLastGift"
    | "lifetimeGiving"
    | "hasRecurringGift"
    | "averageGift"
    | "amountTrend"
    | "eventCount"
    | "dataQualityFlags"
    | "canEmail"
    | "canPhone"
    | "deceased"
    | "doNotSolicit"
  >,
  fiscalYears: number[],
  config: FiscalConfig
): DerivedLabel[] {
  const labels: DerivedLabel[] = [];
  const { currentFiscalYear } = config;
  const priorYear = currentFiscalYear - 1;

  if (partial.paidGiftCount === 0) {
    labels.push("never_donor");
    return labels;
  }

  if (partial.givingYearCount === 1 && partial.paidGiftCount <= 2) {
    labels.push("first_time_donor");
  } else if (partial.givingYearCount >= 2) {
    labels.push("repeat_donor");
  }

  if (partial.givingYearCount >= 3 || partial.lifetimeGiving >= 2500) {
    labels.push("loyal_donor");
  }

  const hasPrior = fiscalYears.includes(priorYear);
  const hasCurrent = fiscalYears.includes(currentFiscalYear);
  const hasAnyBeforePrior = fiscalYears.some((y) => y < priorYear);

  if (hasPrior && !hasCurrent) labels.push("lybunt");
  if (!hasPrior && !hasCurrent && hasAnyBeforePrior) labels.push("sybunt");
  if ((partial.yearsSinceLastGift ?? 0) >= 5) labels.push("long_lapsed");

  if (!hasCurrent && partial.paidGiftCount > 0) labels.push("renewal_candidate");
  if (
    hasCurrent &&
    partial.lifetimeGiving >= 500 &&
    partial.amountTrend >= 0 &&
    !labels.includes("first_time_donor")
  ) {
    labels.push("upgrade_candidate");
  }

  const annualPattern =
    partial.givingYearCount >= 2 &&
    !partial.hasRecurringGift &&
    partial.averageGift > 0 &&
    partial.averageGift <= 500;
  if (partial.hasRecurringGift || annualPattern) labels.push("recurring_candidate");

  if (
    labels.includes("sybunt") ||
    labels.includes("long_lapsed") ||
    (partial.lifetimeGiving >= 300 && !hasCurrent)
  ) {
    labels.push("reactivation_candidate");
  }

  if (hasCurrent) labels.push("stewardship_candidate");
  if (partial.eventCount > 0 && partial.paidGiftCount === 0) {
    labels.push("event_affinity_candidate");
  }

  const dq =
    partial.dataQualityFlags.length > 0 ||
    (!partial.canEmail && !partial.canPhone) ||
    partial.deceased ||
    partial.doNotSolicit;
  if (dq) labels.push("data_quality_problem");

  return labels;
}

// Fix reference to averageGift in deriveLabels - I used partial.averageGift but it's not in Pick type
// I need to add averageGift to the pick or fix recurring candidate logic
