import type { MicrosoftAccountKind } from "@tuesday/m365";

export type M365UserErrorAction = {
  label: string;
  consent: "calendar" | "mail" | "full";
  returnTo?: string;
  accountKind?: MicrosoftAccountKind;
  reauth?: boolean;
};

export type M365UserErrorContext = {
  accountEmail?: string | null;
  outlookReady?: boolean;
  missingCalendarConsent?: boolean;
};

/** Map API error JSON into plain-language copy for fundraisers (no technical jargon). */
export function formatM365UserError(
  data: {
    code?: string;
    message?: string;
    connectUrl?: string;
    requiredScopes?: string[];
  },
  context?: M365UserErrorContext
): {
  title: string;
  detail: string;
  action?: M365UserErrorAction;
  severity: "warning" | "error";
} {
  const code = data.code ?? "MICROSOFT365_ERROR";
  const needsCalendar = data.requiredScopes?.some((s) => s.includes("Calendar"));
  const needsMail = data.requiredScopes?.some((s) => s.includes("Mail"));
  const signedInWithCalendar =
    context?.outlookReady === true && context?.missingCalendarConsent === false;

  const syncFailedCopy = (detailText?: string) => ({
    title: "Couldn't load this week's calendar",
    detail:
      detailText ||
      "You're signed in to Microsoft Outlook. We couldn't load meetings for this week just now. Click Refresh calendar to try again.",
    severity: "warning" as const,
  });

  if (code === "MICROSOFT365_CALENDAR_SYNC_FAILED") {
    return syncFailedCopy(plainMessage(data.message) ?? data.message);
  }

  if (
    code !== "MICROSOFT365_NOT_CONNECTED" &&
    signedInWithCalendar &&
    (code === "MICROSOFT365_PERMISSION_ERROR" || needsCalendar)
  ) {
    const detailText = plainMessage(data.message) ?? data.message;
    return syncFailedCopy(detailText);
  }

  switch (code) {
    case "MICROSOFT365_NOT_CONNECTED":
      return {
        title: "Outlook not connected",
        detail:
          plainMessage(data.message) ??
          "Sign in with Microsoft before building a calendar-aware schedule or sending email.",
        action: { label: "Connect Outlook", consent: "full", returnTo: "/" },
        severity: "error",
      };
    case "MICROSOFT365_PERMISSION_ERROR": {
      const detailText = plainMessage(data.message) ?? data.message ?? "";
      if (needsCalendar) {
        return {
          title: "Calendar access needed",
          detail:
            detailText ||
            "DonoRex needs permission to view your Outlook calendar. Click Connect calendar and choose Allow when Microsoft asks.",
          action: { label: "Connect calendar", consent: "calendar", returnTo: "/" },
          severity: "error",
        };
      }
      if (needsMail) {
        return {
          title: "Email access needed",
          detail:
            "DonoRex needs permission to use your Outlook email. Open Autopilot, click Connect mail, and choose Allow when Microsoft asks.",
          action: { label: "Connect mail", consent: "mail", returnTo: "/autopilot" },
          severity: "error",
        };
      }
      return {
        title: "Calendar access needed",
        detail:
          plainMessage(data.message) ??
          "We couldn't load your Outlook calendar for this week. Click Connect calendar and choose Allow when Microsoft asks.",
        action: { label: "Connect calendar", consent: "calendar", returnTo: "/" },
        severity: "error",
      };
    }
    case "MICROSOFT365_CONFIGURATION_ERROR":
      return {
        title: "Sign-in not available",
        detail:
          "DonoRex isn't set up for Microsoft sign-in on this copy of the app yet. Ask whoever manages DonoRex to finish setup.",
        severity: "error",
      };
    default:
      if (looksTechnical(data.message)) {
        if (needsCalendar && signedInWithCalendar) {
          return syncFailedCopy();
        }
        if (needsCalendar) {
          return {
            title: "Calendar access needed",
            detail:
              "We couldn't read your Outlook calendar. Try Connect calendar and choose Allow when Microsoft asks.",
            action: { label: "Connect calendar", consent: "calendar", returnTo: "/" },
            severity: "error",
          };
        }
        if (needsMail) {
          return {
            title: "Email access needed",
            detail: "We couldn't use your Outlook email. Try Connect mail from Autopilot.",
            action: { label: "Connect mail", consent: "mail", returnTo: "/autopilot" },
            severity: "error",
          };
        }
        if (signedInWithCalendar) {
          return syncFailedCopy();
        }
        return {
          title: "Something went wrong",
          detail:
            "We couldn't connect to Outlook. Try Disconnect, then connect again with the account you use in Outlook.",
          action: { label: "Connect again", consent: "full", returnTo: "/" },
          severity: "error",
        };
      }
      return {
        title: "Outlook connection issue",
        detail: plainMessage(data.message) ?? "Please try connecting to Outlook again.",
        action: { label: "Connect again", consent: "full", returnTo: "/" },
        severity: signedInWithCalendar ? "warning" : "error",
      };
  }
}

function looksTechnical(message?: string): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    /graph|oauth|token|scope|entra|azure|403|401|api|delegated|mailboxnot|calendars\.read|mail\.send/.test(
      m
    )
  );
}

function plainMessage(message?: string): string | undefined {
  if (!message || looksTechnical(message)) return undefined;
  return message;
}
