export type ConnectionArea = "profile" | "calendar" | "mail";

export const CONNECTION_COPY = {
  notConnected:
    "Connect your Microsoft Outlook account to see your calendar here and send email from Tuesday.",
  calendarOk: "Your Outlook calendar is connected. Times and availability come from your live calendar.",
  mailOk: "Your Outlook email is connected. You can draft and approve messages in Autopilot.",
  calendarPending:
    "You're signed in to Microsoft, but we still need permission to view your Outlook calendar.",
  mailPending: "You're signed in to Microsoft, but we still need permission to use your Outlook email.",
  mailSendPending:
    "Almost there — connect mail again and choose Allow when asked to send email for you.",
  signInExpired:
    "Your Microsoft sign-in expired. Click Disconnect, then connect again and sign in with the same account you use in Outlook.",
  adminNeeded:
    "Your organization requires an IT administrator to approve Tuesday for Microsoft Outlook. Ask your admin for help, then try connecting again.",
  setupMissing:
    "Tuesday isn't set up for Microsoft sign-in yet. If someone else runs this app for you, ask them to finish setup.",
} as const;

export function graphFailureMessage(
  area: ConnectionArea,
  status: number,
  errorCode?: string
): string {
  if (errorCode === "InvalidAuthenticationToken" || status === 401) {
    return CONNECTION_COPY.signInExpired;
  }
  if (status === 403) {
    if (area === "calendar") {
      return "We couldn't open your Outlook calendar. Click Connect calendar and choose Allow when Microsoft asks.";
    }
    if (area === "mail") {
      return "We couldn't open your Outlook email. Click Connect mail and choose Allow when Microsoft asks.";
    }
    return "We couldn't finish connecting to Microsoft. Please try again and approve all prompts.";
  }
  if (area === "calendar") {
    return "We couldn't load your Outlook calendar right now. Try Refresh calendar or connect again.";
  }
  if (area === "mail") {
    return "We couldn't load your Outlook email right now. Try connecting mail again from Autopilot.";
  }
  return "We couldn't verify your Microsoft sign-in. Please try connecting again.";
}

export function graphErrorCodeMessage(area: ConnectionArea, errorCode: string, _detail?: string): string | null {
  if (errorCode === "MailboxNotEnabledForRESTAPI") {
    return "This Microsoft account doesn't include Outlook email or calendar. Sign in with the same personal or work account you use at outlook.com.";
  }
  if (errorCode === "ResourceNotFound" && area === "calendar") {
    return "We couldn't find a calendar on this account. Try the Microsoft account you actually use in Outlook.";
  }
  return null;
}

import { isM365AuthError } from "./errors";

export function messageFromAuthError(error: unknown, area: ConnectionArea): string {
  if (!isM365AuthError(error)) {
    return graphFailureMessage(area, 0);
  }
  const e = error;
  if (e.code === "insufficient_scope" || e.code === "consent_required") {
    return scopeMissingMessage(area);
  }
  if (e.code === "admin_consent_required") {
    return CONNECTION_COPY.adminNeeded;
  }
  if (e.code === "reauth_required") {
    return CONNECTION_COPY.signInExpired;
  }
  if (e.message && !/graph|token|scope|401|403|oauth/i.test(e.message)) {
    return e.message;
  }
  return graphFailureMessage(area, 0);
}

export function scopeMissingMessage(area: ConnectionArea): string {
  if (area === "calendar") {
    return "Please connect your calendar and choose Allow when Microsoft asks to view your calendar.";
  }
  if (area === "mail") {
    return "Please connect mail and choose Allow when Microsoft asks to read and send email.";
  }
  return CONNECTION_COPY.calendarPending;
}
