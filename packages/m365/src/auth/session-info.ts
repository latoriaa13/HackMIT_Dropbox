import { isM365Configured, getOAuthConfigErrors, canStartMicrosoftOAuth } from "../config/env";
import { getMicrosoftAccount, hasMicrosoftConnection } from "./account-store";
import { hasCalendarScopes, hasMailScopes } from "./scopes";

export type PublicM365Session = {
  connected: boolean;
  displayName?: string;
  email?: string;
  userId?: string;
  tenantId?: string;
  grantedScopes?: string[];
  provider: "microsoft-graph";
  oauthConfigured: boolean;
  canStartOAuth: boolean;
  configurationError?: boolean;
  configErrors?: string[];
  missingCalendarConsent?: boolean;
  missingMailConsent?: boolean;
  message?: string;
  connectUrl?: string;
};

export function getPublicM365Session(sessionUserId: string): PublicM365Session {
  const oauthConfigured = isM365Configured();
  const canStartOAuth = canStartMicrosoftOAuth();
  if (!canStartOAuth) {
    return {
      connected: false,
      provider: "microsoft-graph",
      oauthConfigured: false,
      canStartOAuth: false,
      configurationError: true,
      message: "Tuesday isn't set up for Microsoft sign-in yet.",
      connectUrl:
        "/api/auth/microsoft/connect?consent=mail&accountKind=personal&pickAccount=1&returnTo=%2Fautopilot",
    };
  }

  const configErrors = getOAuthConfigErrors();
  const account = getMicrosoftAccount(sessionUserId);
  if (!hasMicrosoftConnection(sessionUserId) || !account) {
    return {
      connected: false,
      provider: "microsoft-graph",
      oauthConfigured,
      canStartOAuth: true,
      configErrors: configErrors.length ? configErrors : undefined,
      message: "Connect Microsoft Outlook to see your calendar and send email from Tuesday.",
      connectUrl:
        "/api/auth/microsoft/connect?consent=mail&accountKind=personal&pickAccount=1&returnTo=%2Fautopilot",
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
    canStartOAuth: true,
    missingCalendarConsent: !hasCalendarScopes(scopes),
    missingMailConsent: !hasMailScopes(scopes),
    connectUrl:
      "/api/auth/microsoft/connect?consent=mail&accountKind=personal&pickAccount=1&returnTo=%2Fautopilot",
  };
}
