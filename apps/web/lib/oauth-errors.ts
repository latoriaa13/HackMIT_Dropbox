const ERROR_HINTS: Record<string, string> = {
  not_configured:
    "Tuesday isn't set up for Microsoft sign-in yet. Ask whoever runs this app to finish setup, then try again.",
  oauth_cancelled: "Sign-in was cancelled. Click Connect when you're ready to try again.",
  oauth_denied: "Microsoft didn't approve the sign-in. Try again and choose Allow on each screen.",
  invalid_oauth_state: "That sign-in took too long. Please click Connect and try again.",
  oauth_invalid_client:
    "We couldn't finish signing you in. Ask whoever manages Tuesday to check the Microsoft app settings, then try Connect again.",
  oauth_token_exchange_failed:
    "We couldn't finish signing you in. Wait a moment, then click Connect and sign in with your Outlook account again.",
  calendar_connected:
    "Your Outlook calendar is connected. You can refresh your calendar and build your weekly plan.",
  mail_connected:
    "Your Outlook email is connected. You can draft and send messages from Autopilot.",
  connected:
    "You're connected to Microsoft Outlook. Calendar and email features are ready when you approved access.",
};

export function formatOAuthReturnMessage(code: string): string {
  if (ERROR_HINTS[code]) return ERROR_HINTS[code];
  return formatAutopilotOAuthError(code);
}

export function formatAutopilotOAuthError(code: string): string {
  if (ERROR_HINTS[code]) return ERROR_HINTS[code];
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    decoded = code;
  }
  if (
    decoded.includes("invalid_client") ||
    decoded.includes("AADSTS") ||
    decoded.includes("Client secret") ||
    decoded.includes("Entra") ||
    decoded.includes(".env")
  ) {
    return ERROR_HINTS.oauth_token_exchange_failed;
  }
  if (decoded.length > 120 || /[{}[\]\\]|graph|oauth|token/i.test(decoded)) {
    return "We couldn't finish signing you in. Please click Connect and try again with your Outlook account.";
  }
  return decoded;
}

export const OAUTH_RETURN_STORAGE_KEY = "m365_oauth_return";

export function markMicrosoftOAuthAttempt() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(OAUTH_RETURN_STORAGE_KEY, "1");
  }
}

export function consumeMicrosoftOAuthReturn(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const pending = sessionStorage.getItem(OAUTH_RETURN_STORAGE_KEY) === "1";
  if (pending) sessionStorage.removeItem(OAUTH_RETURN_STORAGE_KEY);
  return pending;
}
