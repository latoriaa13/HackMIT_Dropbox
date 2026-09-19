import { getMicrosoftAccount, saveMicrosoftAccount } from "./account-store";
import { getGraphAccessToken } from "./ms-token-service";
import { hasCalendarScopes, hasMailScopes, mergeGrantedScopes } from "./scopes";
import { isM365AuthError } from "./errors";
import { scopesFromAccessToken } from "./token-scopes";

export type GraphCapabilityProbe = {
  profile: boolean;
  calendar: boolean;
  mail: boolean;
  mailSend: boolean;
  checkedAt: string;
  tokenScopes: string[];
  errors: {
    profile?: string;
    calendar?: string;
    mail?: string;
  };
};

const cache = new Map<string, { at: number; probe: GraphCapabilityProbe }>();
const CACHE_MS = 45_000;

function syncScopesFromToken(sessionUserId: string, accessToken: string) {
  const fromJwt = scopesFromAccessToken(accessToken);
  if (!fromJwt.length) return;
  const account = getMicrosoftAccount(sessionUserId);
  if (!account) return;
  saveMicrosoftAccount({
    ...account,
    grantedScopes: mergeGrantedScopes(account.grantedScopes, fromJwt),
  });
}

async function graphGet(url: string, token: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });
}

function friendlyGraphError(status: number, scope: string): string {
  if (status === 403) {
    return `${scope}: Microsoft Graph denied access (403). In Azure Portal → App registration → API permissions, add delegated ${scope} and grant admin consent, then use Connect calendar/mail again.`;
  }
  if (status === 401) {
    return `${scope}: Session expired — disconnect and connect again.`;
  }
  return `${scope}: Graph request failed (${status}).`;
}

export async function probeGraphCapabilities(
  sessionUserId: string,
  options?: { force?: boolean }
): Promise<GraphCapabilityProbe> {
  const cached = cache.get(sessionUserId);
  if (!options?.force && cached && Date.now() - cached.at < CACHE_MS) {
    return cached.probe;
  }

  const errors: GraphCapabilityProbe["errors"] = {};
  let tokenScopes: string[] = [];
  let profile = false;
  let calendar = false;
  let mail = false;
  let mailSend = false;

  const account = getMicrosoftAccount(sessionUserId);
  if (!account) {
    const empty: GraphCapabilityProbe = {
      profile: false,
      calendar: false,
      mail: false,
      mailSend: false,
      checkedAt: new Date().toISOString(),
      tokenScopes: [],
      errors: { profile: "No Microsoft account linked." },
    };
    return empty;
  }

  try {
    const userToken = await getGraphAccessToken(sessionUserId, "user");
    syncScopesFromToken(sessionUserId, userToken);
    tokenScopes = scopesFromAccessToken(userToken);
    const me = await graphGet("https://graph.microsoft.com/v1.0/me", userToken);
    profile = me.ok;
    if (!me.ok) errors.profile = friendlyGraphError(me.status, "User.Read");
  } catch (e) {
    errors.profile = isM365AuthError(e) ? e.message : "Could not verify Microsoft profile.";
  }

  try {
    const calToken = await getGraphAccessToken(sessionUserId, "calendar");
    syncScopesFromToken(sessionUserId, calToken);
    tokenScopes = mergeGrantedScopes(tokenScopes, scopesFromAccessToken(calToken));
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 86_400_000).toISOString();
    const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}&$top=1`;
    const res = await graphGet(url, calToken);
    calendar = res.ok;
    if (!res.ok) errors.calendar = friendlyGraphError(res.status, "Calendars.Read");
  } catch (e) {
    errors.calendar = isM365AuthError(e)
      ? e.message
      : "Calendar access failed — connect calendar permissions.";
  }

  try {
    const mailToken = await getGraphAccessToken(sessionUserId, "mail");
    syncScopesFromToken(sessionUserId, mailToken);
    tokenScopes = mergeGrantedScopes(tokenScopes, scopesFromAccessToken(mailToken));
    const res = await graphGet("https://graph.microsoft.com/v1.0/me/messages?$top=1", mailToken);
    mail = res.ok;
    if (!res.ok) errors.mail = friendlyGraphError(res.status, "Mail.Read");
    const scopes = scopesFromAccessToken(mailToken);
    mailSend = scopes.some((s) => s === "Mail.Send" || s.includes("Mail.Send"));
    if (mail && !mailSend) {
      errors.mail =
        (errors.mail ? `${errors.mail} ` : "") +
        "Mail.Send is not on your token — reconnect with mail permissions to send email.";
    }
  } catch (e) {
    errors.mail = isM365AuthError(e) ? e.message : "Mail access failed — connect mail permissions.";
  }

  const probe: GraphCapabilityProbe = {
    profile,
    calendar,
    mail,
    mailSend,
    checkedAt: new Date().toISOString(),
    tokenScopes,
    errors,
  };

  cache.set(sessionUserId, { at: Date.now(), probe });
  return probe;
}

export function invalidateCapabilityCache(sessionUserId: string) {
  cache.delete(sessionUserId);
}

/** UI/API: derived flags from live Graph probes (not stored scope guesses). */
export function connectionFlagsFromProbe(probe: GraphCapabilityProbe, accountLinked: boolean) {
  return {
    accountLinked,
    profileReady: probe.profile,
    calendarReady: probe.calendar,
    mailReady: probe.mail && probe.mailSend,
    mailReadReady: probe.mail,
    /** Weekly plan / Outlook card — calendar must work. */
    outlookReady: probe.profile && probe.calendar,
    /** Autopilot email send path. */
    mailAutopilotReady: probe.profile && probe.mail && probe.mailSend,
    missingCalendarConsent: accountLinked && !probe.calendar,
    missingMailConsent: accountLinked && (!probe.mail || !probe.mailSend),
    capabilities: probe,
  };
}

export { hasCalendarScopes, hasMailScopes };
