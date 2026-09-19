export type M365Env = {
  clientId: string | null;
  clientSecret: string | null;
  tenantId: string;
  redirectUri: string;
};

export function getM365Env(): M365Env {
  return {
    clientId: process.env.MICROSOFT_CLIENT_ID?.trim() || null,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET?.trim() || null,
    tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
    redirectUri:
      process.env.MICROSOFT_REDIRECT_URI ?? "http://localhost:3000/api/auth/microsoft/callback",
  };
}

export function isM365Configured(): boolean {
  const e = getM365Env();
  return !!(e.clientId && e.clientSecret);
}

export function getOAuthConfigErrors(): string[] {
  const errors: string[] = [];
  const e = getM365Env();
  if (!e.clientId) errors.push("MICROSOFT_CLIENT_ID is missing");
  if (!e.clientSecret) errors.push("MICROSOFT_CLIENT_SECRET is missing");
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    errors.push("SESSION_SECRET is required in production");
  }
  return errors;
}

/** @deprecated import from ./auth/scopes */
export { M365_SCOPES } from "../auth/scopes";
