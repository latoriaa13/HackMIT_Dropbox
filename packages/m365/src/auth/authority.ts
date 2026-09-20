import { getM365Env } from "../config/env";

/** Segment in https://login.microsoftonline.com/{segment} */
export type MicrosoftAuthoritySegment = string;

export type MicrosoftAccountKind = "personal" | "work" | "default";

export function isGuestExternalMicrosoftEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.includes("#EXT#") || email.toLowerCase().includes("#ext#");
}

export function isSingleTenantGuid(tenantId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
}

export function authoritySegmentForAccountKind(kind: MicrosoftAccountKind): MicrosoftAuthoritySegment {
  const tenantId = getM365Env().tenantId || "common";
  if (kind === "personal") {
    return "consumers";
  }
  if (kind === "work") {
    return isSingleTenantGuid(tenantId) ? tenantId : "organizations";
  }
  if (isSingleTenantGuid(tenantId)) {
    /** `common` allows personal @outlook.com and work/school pickers; tenant GUID blocks personal mail. */
    return "common";
  }
  return tenantId;
}

/** MSAL authority segment for token refresh (must match sign-in). */
export function effectiveAuthAuthoritySegmentForAccount(link: {
  authAuthoritySegment?: string;
  email?: string;
}): MicrosoftAuthoritySegment {
  const saved = link.authAuthoritySegment?.trim();
  if (saved) return saved;
  if (isGuestExternalMicrosoftEmail(link.email)) return "consumers";
  return authoritySegmentForAccountKind("default");
}

export function parseAccountKindParam(value: string | null | undefined): MicrosoftAccountKind {
  if (value === "personal" || value === "work") return value;
  return "default";
}

export function authorityLoginUrl(segment: MicrosoftAuthoritySegment): string {
  return `https://login.microsoftonline.com/${segment}/oauth2/v2.0/authorize`;
}
