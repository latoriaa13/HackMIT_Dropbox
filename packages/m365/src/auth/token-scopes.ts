/** JWT access tokens expose delegated scopes in `scp`; MSAL often returns opaque (non-JWT) tokens. */
export function isJwtAccessToken(accessToken: string): boolean {
  return accessToken.split(".").length >= 2;
}

/** Prefer JWT `scp`; fall back to MSAL-reported scopes for opaque tokens. */
export function delegatedScopesFromToken(accessToken: string, msalScopes?: string[]): string[] {
  const fromJwt = scopesFromAccessToken(accessToken);
  if (fromJwt.length) return fromJwt;
  return msalScopes?.length ? msalScopes : [];
}

/** MSAL opaque tokens + scopes persisted at OAuth (microsoft-accounts.json). */
export function effectiveGrantedScopes(
  storedGranted: string[] | undefined,
  accessToken: string,
  msalScopes?: string[]
): string[] {
  const fromToken = delegatedScopesFromToken(accessToken, msalScopes);
  if (!storedGranted?.length) return fromToken;
  if (!fromToken.length) return storedGranted;
  return [...new Set([...storedGranted, ...fromToken])];
}

/** Decode space-delimited OAuth scopes from a Graph access token (scp claim). */
export function scopesFromAccessToken(accessToken: string): string[] {
  if (!isJwtAccessToken(accessToken)) return [];
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return [];
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      scp?: string;
      roles?: string[];
    };
    if (typeof payload.scp === "string" && payload.scp.trim()) {
      return payload.scp.trim().split(/\s+/);
    }
    if (Array.isArray(payload.roles)) return payload.roles;
    return [];
  } catch {
    return [];
  }
}
