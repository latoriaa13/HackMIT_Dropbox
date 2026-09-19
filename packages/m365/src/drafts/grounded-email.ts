import type { ConstituentProfile } from "@tuesday/core";
import { safeGiftAmountLabel } from "@tuesday/core";

export type EmailDraftEligibility = {
  ok: boolean;
  reasons: string[];
  to: string | null;
};

export function checkEmailOutreachEligible(profile: ConstituentProfile): EmailDraftEligibility {
  const reasons: string[] = [];
  if (profile.deceased) reasons.push("Constituent is deceased");
  if (profile.doNotSolicit) reasons.push("Do-not-solicit flag");
  if (!profile.canEmail) reasons.push("Email not deliverable");
  if (profile.emailStatus === "do_not_email") reasons.push("Do-not-email status");
  if (!profile.primaryEmail?.trim()) reasons.push("Missing email address");
  return {
    ok: reasons.length === 0,
    reasons,
    to: profile.canEmail ? profile.primaryEmail : null,
  };
}

export function generateFollowUpEmail(profile: ConstituentProfile, context: {
  recommendedAction?: string;
  whyNow?: string;
  campaignName?: string;
}): { subject: string; body: string } {
  const name = profile.firstName || profile.displayName || "friend";
  const classLine = profile.classYear ? `Class of ${profile.classYear}` : null;
  const giftLine = profile.paidGiftCount
    ? `Thank you for your support${profile.mostRecentGiftDate ? ` — our records show your last gift (${safeGiftAmountLabel(profile)})` : ""}.`
    : null;
  const eventLine =
    profile.eventCount > 0
      ? `We appreciated seeing you at a recent campus event.`
      : null;
  const activityLine =
    profile.activityNames.length > 0
      ? `Your connection through ${profile.activityNames[0]} means a great deal to our community.`
      : null;

  const subject = context.campaignName
    ? `Following up — ${context.campaignName}`
    : `A note from GiveCampus University — ${context.recommendedAction ?? "staying in touch"}`;

  const lines = [
    `Dear ${name},`,
    "",
    giftLine,
    eventLine,
    activityLine,
    classLine ? `As a member of the ${classLine} community, your engagement matters.` : null,
    context.whyNow ? `We are reaching out now because ${context.whyNow.toLowerCase()}` : null,
    "",
    "Would you be open to a brief conversation about how you might continue to support students this year?",
    "",
    "Warm regards,",
    "Your GiveCampus University advancement team",
    "",
    "---",
    "This draft uses only fields present in your constituent record. No wealth, employment, or personal interests were inferred.",
  ].filter(Boolean);

  return { subject, body: lines.join("\n") };
}
