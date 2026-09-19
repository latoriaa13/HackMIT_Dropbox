/** Decode space-delimited OAuth scopes from a Graph access token (scp claim). */
export function scopesFromAccessToken(accessToken: string): string[] {
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
