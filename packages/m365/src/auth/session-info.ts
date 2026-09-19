import { isM365Configured, getOAuthConfigErrors } from "../config/env";
import { getMicrosoftAccount, hasMicrosoftConnection } from "./account-store";
import { hasCalendarScopes, hasMailScopes } from "./scopes";

export type PublicM365Session = {
  connected: boolean;
  displayName?: string;
  email?: string;
  userId?: string;
  tenantId?: string;
  grantedScopes?: string[];
  provider: "microsoft-graph" | "mock";
  oauthConfigured: boolean;
  configErrors?: string[];
  missingCalendarConsent?: boolean;
  missingMailConsent?: boolean;
  message?: string;
};

export function getPublicM365Session(sessionUserId: string): PublicM365Session {
  const oauthConfigured = isM365Configured();
  if (!oauthConfigured) {
    return {
      connected: false,
      provider: "mock",
      oauthConfigured: false,
      message: "Mock mode — Microsoft OAuth credentials are not configured.",
    };
  }

  const configErrors = getOAuthConfigErrors();
  const account = getMicrosoftAccount(sessionUserId);
  if (!hasMicrosoftConnection(sessionUserId) || !account) {
    return {
      connected: false,
      provider: "microsoft-graph",
      oauthConfigured: true,
      configErrors: configErrors.length ? configErrors : undefined,
      message: "Connect Microsoft 365 to use your calendar and mailbox.",
    };
  }

  const scopes = account.grantedScopes;
  return {
    connected: true,
    displayName: account.displayName,
    email: account.email,
    userId: sessionUserId,
    tenantId: account.tenantId,
    grantedScopes: scopes,
    provider: "microsoft-graph",
    oauthConfigured: true,
    missingCalendarConsent: !hasCalendarScopes(scopes),
    missingMailConsent: !hasMailScopes(scopes),
  };
}
