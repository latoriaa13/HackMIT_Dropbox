/** Delegated Graph scopes — full set used on initial connect (documented in README). */
export const M365_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Calendars.Read",
  "Calendars.ReadWrite",
  "Mail.Read",
  "Mail.ReadWrite",
  "Mail.Send",
] as const;

export const M365_SCOPES_BASIC = ["openid", "profile", "email", "offline_access", "User.Read"] as const;

export const M365_SCOPES_CALENDAR = ["Calendars.Read", "Calendars.ReadWrite"] as const;

export const M365_SCOPES_MAIL = ["Mail.Read", "Mail.ReadWrite", "Mail.Send"] as const;

export type ConsentKind = "basic" | "calendar" | "mail" | "full";

export function scopesForConsent(kind: ConsentKind): string[] {
  switch (kind) {
    case "basic":
      return [...M365_SCOPES_BASIC];
    case "calendar":
      return [...M365_SCOPES_BASIC, ...M365_SCOPES_CALENDAR];
    case "mail":
      return [...M365_SCOPES_BASIC, ...M365_SCOPES_MAIL];
    case "full":
    default:
      return [...M365_SCOPES];
  }
}

export function hasCalendarScopes(granted: string[]): boolean {
  return granted.some((s) => s.includes("Calendars.Read"));
}

export function hasMailScopes(granted: string[]): boolean {
  return granted.some((s) => s.includes("Mail.Read") || s.includes("Mail.Send"));
}
