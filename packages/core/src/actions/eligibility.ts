import type { ActionType, Channel, ConstituentProfile } from "../models/types";
import { ACTION_DEFAULT_CHANNEL } from "./action-config";

export type EligibilityResult = Record<ActionType, { eligible: boolean; reason: string | null }>;

export function checkEligibility(
  profile: ConstituentProfile,
  channels: Channel[]
): EligibilityResult {
  const result = {} as EligibilityResult;
  const allActions: ActionType[] = [
    "thank_you",
    "renewal_ask",
    "upgrade_ask",
    "recurring_gift_ask",
    "event_invitation",
    "personal_call",
    "stewardship_message",
    "reactivation_email",
    "reunion_outreach",
    "data_quality_task",
    "no_action",
  ];

  for (const action of allActions) {
    result[action] = { eligible: true, reason: null };
  }

  if (profile.deceased) {
    for (const action of allActions) {
      if (action !== "no_action") {
        result[action] = { eligible: false, reason: "Constituent is deceased" };
      }
    }
    return result;
  }

  if (profile.doNotSolicit) {
    const solicitActions: ActionType[] = [
      "renewal_ask",
      "upgrade_ask",
      "recurring_gift_ask",
      "reactivation_email",
      "personal_call",
      "reunion_outreach",
    ];
    for (const action of solicitActions) {
      result[action] = { eligible: false, reason: "Do-not-solicit flag" };
    }
  }

  if (!profile.canEmail && !profile.canPhone) {
    result.renewal_ask = { eligible: false, reason: "No contact method" };
    result.upgrade_ask = { eligible: false, reason: "No contact method" };
    result.recurring_gift_ask = { eligible: false, reason: "No contact method" };
    result.reactivation_email = { eligible: false, reason: "No contact method" };
    result.data_quality_task = { eligible: true, reason: null };
  }

  if (!profile.canPhone) {
    result.personal_call = { eligible: false, reason: "Phone not available" };
    if (result.renewal_ask.eligible && !profile.canEmail) {
      result.renewal_ask = { eligible: false, reason: "Phone not available" };
    }
  }

  if (!profile.canEmail) {
    result.reactivation_email = { eligible: false, reason: "Email not deliverable" };
    result.recurring_gift_ask = { eligible: false, reason: "Email not deliverable" };
  }

  if (profile.paidGiftCount === 0) {
    result.thank_you = { eligible: false, reason: "No gifts to thank for" };
    result.renewal_ask = { eligible: false, reason: "Never donated" };
    result.upgrade_ask = { eligible: false, reason: "Never donated" };
    result.recurring_gift_ask = { eligible: false, reason: "Never donated" };
    result.stewardship_message = { eligible: false, reason: "Not a donor" };
  }

  if (profile.gaveCurrentYear && profile.labels.includes("first_time_donor")) {
    result.upgrade_ask = { eligible: false, reason: "First-time donor — nurture before upgrade" };
    result.renewal_ask = { eligible: false, reason: "Already gave this fiscal year" };
  }

  if (profile.gaveCurrentYear && !profile.labels.includes("first_time_donor")) {
    result.renewal_ask = { eligible: false, reason: "Already renewed this fiscal year" };
    result.reactivation_email = { eligible: false, reason: "Active this fiscal year" };
  }

  if (profile.amountTrend < -0.15) {
    result.upgrade_ask = { eligible: false, reason: "Declining gift trend" };
  }

  if (profile.eventCount === 0) {
    result.event_invitation = { eligible: false, reason: "No prior event engagement" };
  }

  if (!profile.labels.includes("lybunt") && !profile.labels.includes("sybunt")) {
    result.reactivation_email = {
      eligible: profile.labels.includes("reactivation_candidate"),
      reason: profile.labels.includes("reactivation_candidate") ? null : "Not a reactivation candidate",
    };
  }

  if (profile.hasRecurringGift) {
    result.recurring_gift_ask = { eligible: false, reason: "Already has recurring gift" };
  }

  // Channel filter
  for (const action of allActions) {
    if (!result[action].eligible) continue;
    const ch = ACTION_DEFAULT_CHANNEL[action];
    if (ch === "none") continue;
    if (!channels.includes(ch)) {
      const alt = pickAlternateChannel(action, profile, channels);
      if (!alt) {
        result[action] = { eligible: false, reason: `Channel ${ch} not selected` };
      }
    }
  }

  return result;
}

function pickAlternateChannel(
  action: ActionType,
  profile: ConstituentProfile,
  channels: Channel[]
): Channel | null {
  if (action === "renewal_ask" || action === "personal_call") {
    if (channels.includes("phone") && profile.canPhone) return "phone";
    if (channels.includes("email") && profile.canEmail) return "email";
  }
  if (channels.includes("email") && profile.canEmail) return "email";
  if (channels.includes("phone") && profile.canPhone) return "phone";
  if (channels.includes("stewardship_message")) return "stewardship_message";
  if (channels.includes("event_invitation")) return "event_invitation";
  return null;
}

export function resolveChannel(
  action: ActionType,
  profile: ConstituentProfile,
  channels: Channel[]
): Channel | "none" {
  const preferred = ACTION_DEFAULT_CHANNEL[action];
  if (preferred === "none") return "none";
  if (channels.includes(preferred)) {
    if (preferred === "phone" && !profile.canPhone) return profile.canEmail && channels.includes("email") ? "email" : "none";
    if (preferred === "email" && !profile.canEmail) return profile.canPhone && channels.includes("phone") ? "phone" : "none";
    return preferred;
  }
  return pickAlternateChannel(action, profile, channels) ?? "none";
}
