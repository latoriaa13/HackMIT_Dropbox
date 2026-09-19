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
  identity?: {
    userPrincipalName?: string;
    mail?: string;
    userType?: string;
  };
  errors: {
    profile?: string;
    calendar?: string;
    mail?: string;
  };
  graphErrorCodes?: {
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

function friendlyGraphError(status: number, scope: string, detail?: string, code?: string): string {
  if (status === 403) {
    return `${scope}: Microsoft Graph denied access (403). In Azure Portal → App registration → API permissions, add delegated ${scope} and grant admin consent, then use Connect calendar/mail again.`;
  }
  if (status === 401) {
    if (code === "InvalidAuthenticationToken") {
      return `${scope}: Microsoft rejected the access token (401). Disconnect, then Reconnect (all permissions). If this repeats, sign out of Microsoft in the browser and pick the account you use at outlook.com — Personal account, not Work/school guest (#EXT#).`;
    }
    return `${scope}: Microsoft Graph rejected this request (401${code ? `, ${code}` : ""}). Tuesday only reads calendars stored in Microsoft's cloud for the exact account you signed into — not Gmail calendars synced into the Outlook app unless that Gmail is a personal Microsoft account. Guest (#EXT#) work/school sign-ins usually need an Exchange mailbox in Azure; events you see from a connected Gmail account may not appear here.`;
  }
  return detail ? `${scope}: Graph request failed (${status}). ${detail}` : `${scope}: Graph request failed (${status}).`;
}

type GraphErrorBody = { error?: { code?: string; message?: string } };

function explainGraphFailure(status: number, scope: string, body?: GraphErrorBody): string {
  const code = body?.error?.code ?? "";
  const msg = body?.error?.message ?? "";
  if (code === "MailboxNotEnabledForRESTAPI" || msg.includes("MailboxNotEnabledForRESTAPI")) {
    return `${scope}: This signed-in identity has no Outlook/Exchange mailbox. Tuesday cannot read calendar or mail for guest (#EXT#) or directory-only accounts. Sign in with @outlook.com or a work/school Microsoft 365 account that has Outlook.`;
  }
  if (code === "ResourceNotFound" && scope.includes("Calendar")) {
    return `${scope}: No default calendar found for this account. Use a Microsoft account with an active Outlook calendar.`;
  }
  return friendlyGraphError(status, scope, msg || undefined, code || undefined);
}

async function graphGetAuthed(
  sessionUserId: string,
  scopeGroup: "user" | "calendar" | "mail",
  url: string
): Promise<{
  ok: boolean;
  status: number;
  detail?: string;
  userMessage?: string;
  errorCode?: string;
}> {
  let token = await getGraphAccessToken(sessionUserId, scopeGroup);
  let res = await graphGet(url, token);
  if (res.status === 401) {
    invalidateCapabilityCache(sessionUserId);
    token = await getGraphAccessToken(sessionUserId, scopeGroup, { forceRefresh: true });
    res = await graphGet(url, token);
  }
  let body: GraphErrorBody | undefined;
  if (!res.ok) {
    try {
      body = (await res.clone().json()) as GraphErrorBody;
    } catch {
      body = undefined;
    }
  }
  const scopeLabel =
    scopeGroup === "calendar" ? "Calendars.Read" : scopeGroup === "mail" ? "Mail.Read" : "User.Read";
  return {
    ok: res.ok,
    status: res.status,
    detail: body?.error?.message,
    errorCode: body?.error?.code,
    userMessage: res.ok ? undefined : explainGraphFailure(res.status, scopeLabel, body),
  };
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
  const graphErrorCodes: NonNullable<GraphCapabilityProbe["graphErrorCodes"]> = {};
  let identity: GraphCapabilityProbe["identity"];
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
    const meUrl =
      "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,userType";
    const me = await graphGetAuthed(sessionUserId, "user", meUrl);
    profile = me.ok;
    if (me.ok) {
      const userToken = await getGraphAccessToken(sessionUserId, "user");
      syncScopesFromToken(sessionUserId, userToken);
      tokenScopes = scopesFromAccessToken(userToken);
      try {
        const meRes = await graphGet(meUrl, userToken);
        if (meRes.ok) {
          const data = (await meRes.json()) as {
            userPrincipalName?: string;
            mail?: string;
            userType?: string;
          };
          identity = {
            userPrincipalName: data.userPrincipalName,
            mail: data.mail,
            userType: data.userType,
          };
        }
      } catch {
        /* optional enrichment */
      }
    } else {
      if (me.errorCode) graphErrorCodes.profile = me.errorCode;
      errors.profile = me.userMessage ?? friendlyGraphError(me.status, "User.Read", me.detail, me.errorCode);
    }
  } catch (e) {
    errors.profile = isM365AuthError(e) ? e.message : "Could not verify Microsoft profile.";
  }

  try {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 86_400_000).toISOString();
    const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}&$top=1`;
    const res = await graphGetAuthed(sessionUserId, "calendar", url);
    calendar = res.ok;
    if (res.ok) {
      const calToken = await getGraphAccessToken(sessionUserId, "calendar");
      syncScopesFromToken(sessionUserId, calToken);
      tokenScopes = mergeGrantedScopes(tokenScopes, scopesFromAccessToken(calToken));
    } else {
      if (res.errorCode) graphErrorCodes.calendar = res.errorCode;
      errors.calendar =
        res.userMessage ?? friendlyGraphError(res.status, "Calendars.Read", res.detail, res.errorCode);
    }
  } catch (e) {
    errors.calendar = isM365AuthError(e)
      ? e.message
      : "Calendar access failed — connect calendar permissions.";
  }

  try {
    const res = await graphGetAuthed(
      sessionUserId,
      "mail",
      "https://graph.microsoft.com/v1.0/me/messages?$top=1"
    );
    mail = res.ok;
    if (res.ok) {
      const mailToken = await getGraphAccessToken(sessionUserId, "mail");
      syncScopesFromToken(sessionUserId, mailToken);
      tokenScopes = mergeGrantedScopes(tokenScopes, scopesFromAccessToken(mailToken));
      const scopes = scopesFromAccessToken(mailToken);
      mailSend = scopes.some((s) => s === "Mail.Send" || s.includes("Mail.Send"));
      if (!mailSend) {
        errors.mail =
          "Mail.Send is not on your token — reconnect with mail permissions to send email.";
      }
    } else {
      if (res.errorCode) graphErrorCodes.mail = res.errorCode;
      errors.mail = res.userMessage ?? friendlyGraphError(res.status, "Mail.Read", res.detail, res.errorCode);
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
    identity,
    errors,
    graphErrorCodes: Object.keys(graphErrorCodes).length ? graphErrorCodes : undefined,
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
