const ERROR_HINTS: Record<string, string> = {
  not_configured: "Add MICROSOFT_CLIENT_ID to .env.local (see .env.example).",
  oauth_cancelled: "Microsoft sign-in was cancelled.",
  oauth_denied: "Microsoft denied the sign-in request.",
  invalid_oauth_state: "OAuth state expired or was invalid — try Connect again.",
  oauth_invalid_client:
    "Microsoft sign-in failed: the app client secret is wrong or expired. Update MICROSOFT_CLIENT_SECRET in .env.local, restart the dev server, then connect again.",
  oauth_token_exchange_failed:
    "Microsoft sign-in could not be completed. Check Entra app credentials in .env.local and try Connect again.",
  calendar_connected:
    "Outlook calendar connected — you can refresh your calendar and build a schedule on the weekly plan.",
  mail_connected:
    "Outlook mail connected — you can draft email in Autopilot and on the weekly queue.",
  connected:
    "Microsoft 365 connected — calendar and mail features are available when permissions were granted.",
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
    decoded.includes("AADSTS7000215") ||
    decoded.includes("Client secret")
  ) {
    return ERROR_HINTS.oauth_invalid_client;
  }
  if (decoded.length > 200) {
    return ERROR_HINTS.oauth_token_exchange_failed;
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
