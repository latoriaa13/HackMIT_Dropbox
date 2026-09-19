/** Map API error JSON from m365ErrorToHttpResponse into user-facing copy. */
export function formatM365UserError(data: {
  code?: string;
  message?: string;
  connectUrl?: string;
  requiredScopes?: string[];
}): {
  title: string;
  detail: string;
  action?: { label: string; consent: "calendar" | "mail" | "full"; returnTo?: string };
} {
  const code = data.code ?? "MICROSOFT365_ERROR";
  const message = data.message ?? "Something went wrong with Microsoft 365.";

  switch (code) {
    case "MICROSOFT365_NOT_CONNECTED":
      return {
        title: "Microsoft 365 not connected",
        detail: "Sign in with Microsoft before using calendar or mail features.",
        action: { label: "Connect Microsoft 365", consent: "full", returnTo: "/" },
      };
    case "MICROSOFT365_PERMISSION_ERROR": {
      const needsCalendar = data.requiredScopes?.some((s) => s.includes("Calendar"));
      const needsMail = data.requiredScopes?.some((s) => s.includes("Mail"));
      if (needsCalendar) {
        return {
          title: "Calendar permission required",
          detail:
            "Tuesday can see your profile but not your Outlook calendar yet. Connect calendar access the same way as mail — Microsoft will show a consent screen for Calendars.Read.",
          action: { label: "Connect calendar", consent: "calendar", returnTo: "/" },
        };
      }
      if (needsMail) {
        return {
          title: "Mail permission required",
          detail: "Grant mail permissions to draft and send email through Autopilot.",
          action: { label: "Connect mail", consent: "mail", returnTo: "/autopilot" },
        };
      }
      return {
        title: "Additional Microsoft permission required",
        detail: message,
        action: { label: "Review permissions", consent: "full", returnTo: "/" },
      };
    }
    case "MICROSOFT365_CONFIGURATION_ERROR":
      return {
        title: "Microsoft Entra not configured",
        detail: "Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env.local, then restart the dev server.",
      };
    default:
      if (message.toLowerCase().includes("calendar permission")) {
        return {
          title: "Calendar permission required",
          detail: message,
          action: { label: "Connect calendar", consent: "calendar", returnTo: "/" },
        };
      }
      return { title: "Microsoft 365 error", detail: message };
  }
}
