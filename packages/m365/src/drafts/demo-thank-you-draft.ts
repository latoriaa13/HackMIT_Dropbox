import { createEmailDraftRecord, listPendingDrafts } from "../storage/draft-store";

export const DEFAULT_DEMO_THANK_YOU_TO = "avalatoria0913@gmail.com";

export function demoThankYouRecipient(): string {
  return process.env.DEMO_THANK_YOU_EMAIL?.trim() || DEFAULT_DEMO_THANK_YOU_TO;
}

/**
 * Keeps one demo thank-you draft in the Autopilot inbox for the configured recipient.
 * Recreates after approve/send on each pending load — only skips if a draft is already waiting.
 */
export function ensureDemoThankYouEmailDraft(userId: string) {
  if (process.env.DEMO_THANK_YOU_EMAIL === "off") return null;
  const to = demoThankYouRecipient();
  const pending = listPendingDrafts(userId);
  const exists = pending.emails.some(
    (d) => d.status === "draft" && d.to.some((addr) => addr.toLowerCase() === to.toLowerCase())
  );
  if (exists) return null;

  const subject = "Thank you for your support — GiveCampus University";
  const body = [
    "Dear Ava,",
    "",
    "Thank you for your continued generosity and for taking time to engage with our advancement team this week.",
    "Your support helps us prioritize student-facing programs and stewardship that donors can see and trust.",
    "",
    "This message is a demo draft in Tuesday Autopilot — approve it below to send through your connected Microsoft 365 mailbox.",
    "",
    "With gratitude,",
    "Your GiveCampus University advancement team",
    "",
    "---",
    "Demo draft · recipient configured for live send test.",
  ].join("\n");

  return createEmailDraftRecord(userId, {
    to: [to],
    subject,
    body,
    relatedConstituentIds: [],
  });
}
