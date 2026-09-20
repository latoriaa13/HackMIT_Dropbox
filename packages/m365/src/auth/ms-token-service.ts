import type { AuthenticationResult, AccountInfo } from "@azure/msal-node";
import { createMsalClient, loadMsalCacheIntoClient, persistMsalCacheFromClient } from "./msal-server";
import { getMicrosoftAccount } from "./account-store";
import { M365AuthError } from "./errors";
import { M365_SCOPES_CALENDAR, M365_SCOPES_MAIL, mergeGrantedScopes } from "./scopes";
import { delegatedScopesFromToken, scopesFromAccessToken } from "./token-scopes";
import { saveMicrosoftAccount } from "./account-store";
import { effectiveAuthAuthoritySegmentForAccount } from "./authority";

function mapMsalError(e: unknown, requiredScopes: string[]): never {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  if (lower.includes("consent") || lower.includes("interaction_required")) {
    throw new M365AuthError(
      "Additional Microsoft consent is required.",
      "consent_required",
      requiredScopes
    );
  }
  if (lower.includes("invalid_grant") || lower.includes("refresh token")) {
    throw new M365AuthError("Microsoft session expired — sign in again.", "reauth_required");
  }
  if (lower.includes("conditional access")) {
    throw new M365AuthError("Conditional access blocked this sign-in.", "conditional_access");
  }
  if (lower.includes("admin") && lower.includes("consent")) {
    throw new M365AuthError("Your tenant requires admin consent for these permissions.", "admin_consent_required");
  }
  throw new M365AuthError(msg || "Microsoft Graph authentication failed.", "graph_error");
}

async function acquireForAccount(
  sessionUserId: string,
  scopes: string[],
  forceRefresh = false
): Promise<AuthenticationResult> {
  const link = getMicrosoftAccount(sessionUserId);
  if (!link) {
    throw new M365AuthError("Microsoft 365 is not connected.", "reauth_required");
  }
  const authoritySegment = effectiveAuthAuthoritySegmentForAccount(link);
  const client = createMsalClient({ authoritySegment });
  await loadMsalCacheIntoClient(client, sessionUserId);
  const cache = client.getTokenCache();
  const accounts = await cache.getAllAccounts();
  const account =
    accounts.find((a) => a.homeAccountId === link.homeAccountId) ?? (accounts[0] as AccountInfo | undefined);
  if (!account) {
    throw new M365AuthError("Microsoft account not found in cache — reconnect.", "reauth_required");
  }
  try {
    const result = await client.acquireTokenSilent({ account, scopes, forceRefresh });
    if (!result?.accessToken) throw new Error("No access token");
    await persistMsalCacheFromClient(client, sessionUserId);
    syncTokenScopesToAccount(sessionUserId, result.accessToken, result.scopes);
    return result;
  } catch (e) {
    if (forceRefresh) mapMsalError(e, scopes);
    try {
      const result = await client.acquireTokenSilent({ account, scopes, forceRefresh: true });
      if (!result?.accessToken) throw new Error("No access token");
      await persistMsalCacheFromClient(client, sessionUserId);
      syncTokenScopesToAccount(sessionUserId, result.accessToken, result.scopes);
      return result;
    } catch (retryErr) {
      mapMsalError(retryErr, scopes);
    }
  }
}

function syncTokenScopesToAccount(
  sessionUserId: string,
  accessToken: string,
  msalScopes?: string[]
) {
  const link = getMicrosoftAccount(sessionUserId);
  if (!link) return;
  const incoming = delegatedScopesFromToken(accessToken, msalScopes);
  if (!incoming.length) return;
  saveMicrosoftAccount({
    ...link,
    grantedScopes: mergeGrantedScopes(link.grantedScopes, incoming),
  });
}

export type GraphTokenBundle = {
  accessToken: string;
  /** Scopes from token / MSAL only. */
  delegatedScopes: string[];
  /** Token + MSAL + stored OAuth grants (handles opaque access tokens). */
  effectiveScopes: string[];
};

export async function acquireGraphTokenBundle(
  sessionUserId: string,
  scopeGroup: "user" | "calendar" | "mail" = "user",
  options?: { forceRefresh?: boolean }
): Promise<GraphTokenBundle> {
  const link = getMicrosoftAccount(sessionUserId);
  const base = ["User.Read"];
  let scopes: string[] = base;
  if (scopeGroup === "calendar") scopes = [...base, ...M365_SCOPES_CALENDAR];
  if (scopeGroup === "mail") scopes = [...base, ...M365_SCOPES_MAIL];
  const result = await acquireForAccount(sessionUserId, scopes, options?.forceRefresh === true);
  const delegatedScopes = delegatedScopesFromToken(result.accessToken, result.scopes);
  const effectiveScopes = mergeGrantedScopes(link?.grantedScopes, delegatedScopes);
  return { accessToken: result.accessToken, delegatedScopes, effectiveScopes };
}

export async function getGraphAccessToken(
  sessionUserId: string,
  scopeGroup: "user" | "calendar" | "mail" = "user",
  options?: { forceRefresh?: boolean }
) {
  const link = getMicrosoftAccount(sessionUserId);
  const base = ["User.Read"];
  let scopes: string[] = base;
  if (scopeGroup === "calendar") scopes = [...base, ...M365_SCOPES_CALENDAR];
  if (scopeGroup === "mail") scopes = [...base, ...M365_SCOPES_MAIL];
  const result = await acquireForAccount(sessionUserId, scopes, options?.forceRefresh === true);
  const tokenScopes = mergeGrantedScopes(
    link?.grantedScopes,
    delegatedScopesFromToken(result.accessToken, result.scopes)
  );
  const scopeGranted = (needle: string) =>
    tokenScopes.some((g) => g.includes(needle)) || scopes.some((g) => g.includes(needle));
  if (scopeGroup === "calendar" && !scopeGranted("Calendars")) {
    throw new M365AuthError(
      "Please connect your calendar and choose Allow when Microsoft asks to view your calendar.",
      "insufficient_scope",
      [...M365_SCOPES_CALENDAR]
    );
  }
  if (scopeGroup === "mail" && !scopeGranted("Mail")) {
    throw new M365AuthError(
      "Please connect mail and choose Allow when Microsoft asks to read and send email.",
      "insufficient_scope",
      [...M365_SCOPES_MAIL]
    );
  }
  return result.accessToken;
}

export async function fetchMicrosoftProfile(accessToken: string): Promise<{
  displayName: string;
  email: string;
  id: string;
}> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new M365AuthError("Could not load Microsoft profile.", "graph_error");
  }
  const data = (await res.json()) as {
    displayName?: string;
    mail?: string;
    userPrincipalName?: string;
    id?: string;
  };
  return {
    displayName: data.displayName ?? "Microsoft user",
    email: data.mail ?? data.userPrincipalName ?? "",
    id: data.id ?? "",
  };
}
