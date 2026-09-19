import type { ActionType, Channel } from "../models/types";

export const ACTION_MINUTES: Record<ActionType, number> = {
  thank_you: 5,
  stewardship_message: 8,
  renewal_ask: 20,
  upgrade_ask: 25,
  recurring_gift_ask: 18,
  event_invitation: 10,
  personal_call: 30,
  reactivation_email: 12,
  reunion_outreach: 15,
  data_quality_task: 15,
  no_action: 0,
};

export const ACTION_DEFAULT_CHANNEL: Record<ActionType, Channel | "none"> = {
  thank_you: "stewardship_message",
  stewardship_message: "stewardship_message",
  renewal_ask: "phone",
  upgrade_ask: "phone",
  recurring_gift_ask: "email",
  event_invitation: "event_invitation",
  personal_call: "phone",
  reactivation_email: "email",
  reunion_outreach: "email",
  data_quality_task: "email",
  no_action: "none",
};

export const ACTION_LABELS: Record<ActionType, string> = {
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

export function channelMinutes(channel: Channel, baseMinutes: number): number {
  if (channel === "phone") return Math.max(baseMinutes, 25);
  if (channel === "event_invitation") return Math.max(baseMinutes, 10);
  return baseMinutes;
}
