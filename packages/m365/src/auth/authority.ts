import { getM365Env } from "../config/env";

/** Segment in https://login.microsoftonline.com/{segment} */
export type MicrosoftAuthoritySegment = string;

export type MicrosoftAccountKind = "personal" | "work" | "default";

export function authoritySegmentForAccountKind(kind: MicrosoftAccountKind): MicrosoftAuthoritySegment {
  switch (kind) {
    case "personal":
      return "consumers";
    case "work":
      return "organizations";
    default:
      return getM365Env().tenantId || "common";
  }
}

export function parseAccountKindParam(value: string | null | undefined): MicrosoftAccountKind {
  if (value === "personal" || value === "work") return value;
  return "default";
}

export function authorityLoginUrl(segment: MicrosoftAuthoritySegment): string {
  return `https://login.microsoftonline.com/${segment}/oauth2/v2.0/authorize`;
}
