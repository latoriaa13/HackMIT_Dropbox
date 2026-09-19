import type { ActionType } from "@tuesday/core";

const ACTION_DISPLAY: Record<ActionType, string> = {
  thank_you: "Thank-you message",
  stewardship_message: "Stewardship message",
  renewal_ask: "Personal renewal call",
  upgrade_ask: "Upgrade conversation",
  recurring_gift_ask: "Recurring-gift invitation",
  event_invitation: "Event invitation",
  personal_call: "Personal call",
  reactivation_email: "Reactivation email",
  reunion_outreach: "Reunion outreach",
  data_quality_task: "Data-quality follow-up",
  no_action: "Do not solicit yet",
};

export function formatAction(a: ActionType): string {
  return ACTION_DISPLAY[a] ?? a;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function confidenceLabel(c: number): string {
  if (c >= 0.75) return "High";
  if (c >= 0.5) return "Medium";
  return "Low";
}
