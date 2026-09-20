import { isGuestExternalMicrosoftEmail } from "./authority";
import { getMicrosoftAccount, saveMicrosoftAccount } from "./account-store";
import { acquireGraphTokenBundle, getGraphAccessToken } from "./ms-token-service";
import { hasCalendarScopes, hasMailScopes, hasMailSendScope, mergeGrantedScopes } from "./scopes";
import { isM365AuthError } from "./errors";
import {
  CONNECTION_COPY,
  graphErrorCodeMessage,
  graphFailureMessage,
  messageFromAuthError,
  type ConnectionArea,
} from "./user-connection-messages";

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
const inflight = new Map<string, Promise<GraphCapabilityProbe>>();
const CACHE_MS = 45_000;

function syncScopesFromBundle(sessionUserId: string, effectiveScopes: string[]) {
  if (!effectiveScopes.length) return;
  const account = getMicrosoftAccount(sessionUserId);
  if (!account) return;
  saveMicrosoftAccount({
    ...account,
    grantedScopes: mergeGrantedScopes(account.grantedScopes, effectiveScopes),
  });
}

async function graphGet(url: string, token: string, outlookTimeZone?: string): Promise<Response> {
  const preferTz = outlookTimeZone?.replace(/"/g, "") ?? "UTC";
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: `outlook.timezone="${preferTz}"`,
    },
  });
}

type GraphErrorBody = { error?: { code?: string; message?: string } };

function explainGraphFailure(status: number, area: ConnectionArea, body?: GraphErrorBody): string {
  const code = body?.error?.code ?? "";
  const msg = body?.error?.message ?? "";
  if (code === "MailboxNotEnabledForRESTAPI" || msg.includes("MailboxNotEnabledForRESTAPI")) {
    return graphErrorCodeMessage(area, "MailboxNotEnabledForRESTAPI")!;
  }
  if (code === "ResourceNotFound" && area === "calendar") {
    return graphErrorCodeMessage(area, "ResourceNotFound")!;
  }
  if (msg.toLowerCase().includes("admin consent") || code.includes("Authorization_RequestDenied")) {
    return CONNECTION_COPY.adminNeeded;
  }
  const byCode = code ? graphErrorCodeMessage(area, code, msg) : null;
  if (byCode) return byCode;
  return graphFailureMessage(area, status, code || undefined);
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
  const account = getMicrosoftAccount(sessionUserId);
  const preferTz = account?.outlookTimeZone;
  let token = await getGraphAccessToken(sessionUserId, scopeGroup);
  let res = await graphGet(url, token, preferTz);
  if (res.status === 401) {
    invalidateCapabilityCache(sessionUserId);
    token = await getGraphAccessToken(sessionUserId, scopeGroup, { forceRefresh: true });
    res = await graphGet(url, token, preferTz);
  }
  let body: GraphErrorBody | undefined;
  if (!res.ok) {
    try {
      body = (await res.clone().json()) as GraphErrorBody;
    } catch {
      body = undefined;
    }
  }
  const area: ConnectionArea =
    scopeGroup === "calendar" ? "calendar" : scopeGroup === "mail" ? "mail" : "profile";
  return {
    ok: res.ok,
    status: res.status,
    detail: body?.error?.message,
    errorCode: body?.error?.code,
    userMessage: res.ok ? undefined : explainGraphFailure(res.status, area, body),
  };
}

async function runGraphCapabilityProbe(sessionUserId: string): Promise<GraphCapabilityProbe> {
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
      errors: { profile: CONNECTION_COPY.notConnected },
    };
    return empty;
  }

  try {
    const meUrl =
      "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,userType";
    const me = await graphGetAuthed(sessionUserId, "user", meUrl);
    profile = me.ok;
    if (me.ok) {
      const userBundle = await acquireGraphTokenBundle(sessionUserId, "user");
      syncScopesFromBundle(sessionUserId, userBundle.effectiveScopes);
      tokenScopes = userBundle.effectiveScopes;
      try {
        const meRes = await graphGet(meUrl, userBundle.accessToken);
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
      errors.profile = me.userMessage ?? graphFailureMessage("profile", me.status, me.errorCode);
    }
  } catch (e) {
    errors.profile = messageFromAuthError(e, "profile");
  }

  try {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 86_400_000).toISOString();
    const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}&$top=1`;
    const res = await graphGetAuthed(sessionUserId, "calendar", url);
    calendar = res.ok;
    if (res.ok) {
      const calBundle = await acquireGraphTokenBundle(sessionUserId, "calendar");
      syncScopesFromBundle(sessionUserId, calBundle.effectiveScopes);
      tokenScopes = mergeGrantedScopes(tokenScopes, calBundle.effectiveScopes);
    } else {
      if (res.errorCode) graphErrorCodes.calendar = res.errorCode;
      errors.calendar = res.userMessage ?? graphFailureMessage("calendar", res.status, res.errorCode);
    }
  } catch (e) {
    errors.calendar = messageFromAuthError(e, "calendar");
  }

  try {
    const res = await graphGetAuthed(
      sessionUserId,
      "mail",
      "https://graph.microsoft.com/v1.0/me/messages?$top=1"
    );
    mail = res.ok;
    if (res.ok) {
      const mailBundle = await acquireGraphTokenBundle(sessionUserId, "mail");
      syncScopesFromBundle(sessionUserId, mailBundle.effectiveScopes);
      tokenScopes = mergeGrantedScopes(tokenScopes, mailBundle.effectiveScopes);
      mailSend = hasMailSendScope(mailBundle.effectiveScopes);
      if (!mailSend) {
        errors.mail = CONNECTION_COPY.mailSendPending;
      }
    } else {
      if (res.errorCode) graphErrorCodes.mail = res.errorCode;
      errors.mail = res.userMessage ?? graphFailureMessage("mail", res.status, res.errorCode);
    }
  } catch (e) {
    errors.mail = messageFromAuthError(e, "mail");
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

export async function probeGraphCapabilities(
  sessionUserId: string,
  options?: { force?: boolean }
): Promise<GraphCapabilityProbe> {
  const cached = cache.get(sessionUserId);
  if (!options?.force && cached && Date.now() - cached.at < CACHE_MS) {
    return cached.probe;
  }

  if (!options?.force) {
    const pending = inflight.get(sessionUserId);
    if (pending) return pending;
  }

  const run = runGraphCapabilityProbe(sessionUserId).finally(() => {
    inflight.delete(sessionUserId);
  });
  if (!options?.force) inflight.set(sessionUserId, run);
  return run;
}

export function invalidateCapabilityCache(sessionUserId: string) {
  cache.delete(sessionUserId);
  inflight.delete(sessionUserId);
}

/** Fast flags from last OAuth scopes — no live Graph calls (for per-row UI). */
export function connectionFlagsFromStoredAccount(sessionUserId: string) {
  const account = getMicrosoftAccount(sessionUserId);
  const accountLinked = !!account;
  const guest = isGuestExternalMicrosoftEmail(account?.email);
  const scopes = account?.grantedScopes ?? [];
  const calendarScoped = hasCalendarScopes(scopes);
  const mailScoped = hasMailScopes(scopes);
  const sendScoped = hasMailSendScope(scopes);
  const mailOk = accountLinked && mailScoped && sendScoped && !guest;
  return {
    accountLinked,
    profileReady: accountLinked,
    calendarReady: accountLinked && calendarScoped,
    mailReady: mailOk,
    mailReadReady: accountLinked && mailScoped && !guest,
    outlookReady: accountLinked && calendarScoped,
    mailAutopilotReady: mailOk,
    missingCalendarConsent: accountLinked && !calendarScoped,
    missingMailConsent: accountLinked && (guest || !mailScoped || !sendScoped),
  };
}

/** UI/API: derived flags from live Graph probes (not stored scope guesses). */
export function connectionFlagsFromProbe(
  probe: GraphCapabilityProbe,
  accountLinked: boolean,
  accountEmail?: string | null
) {
  const guest = isGuestExternalMicrosoftEmail(accountEmail);
  const mailOk = !guest && probe.profile && probe.mail && probe.mailSend;
  return {
    accountLinked,
    profileReady: probe.profile,
    calendarReady: probe.calendar,
    mailReady: mailOk,
    mailReadReady: !guest && probe.mail,
    /** Weekly plan / Outlook card — calendar must work. */
    outlookReady: probe.profile && probe.calendar,
    /** Autopilot email send path. */
    mailAutopilotReady: mailOk,
    missingCalendarConsent: accountLinked && !probe.calendar,
    missingMailConsent: accountLinked && (guest || !probe.mail || !probe.mailSend),
    capabilities: probe,
  };
}

export { hasCalendarScopes, hasMailScopes };
