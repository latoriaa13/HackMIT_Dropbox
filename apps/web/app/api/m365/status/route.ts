import { NextResponse } from "next/server";
import { getPublicM365Session, isMicrosoft365Connected, requireMicrosoft365Provider } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const sessionUserId = await getSessionUserId();
  const pub = getPublicM365Session(sessionUserId);

  if (!isMicrosoft365Connected(sessionUserId)) {
    return NextResponse.json({
      connected: false,
      mode: "microsoft_graph",
      accountEmail: null,
      accountName: null,
      grantedScopes: [],
      configured: pub.oauthConfigured,
      message: pub.message,
      oauthConfigured: pub.oauthConfigured,
      canStartOAuth: pub.canStartOAuth,
      provider: pub.provider,
      configurationError: pub.configurationError,
      configErrors: pub.configErrors,
      connectUrl: pub.connectUrl,
      missingCalendarConsent: pub.missingCalendarConsent,
      missingMailConsent: pub.missingMailConsent,
    });
  }

  const provider = requireMicrosoft365Provider(sessionUserId);
  const status = await provider.getConnectionStatus();
  return NextResponse.json({
    ...status,
    oauthConfigured: pub.oauthConfigured,
    canStartOAuth: pub.canStartOAuth,
    provider: pub.provider,
    displayName: pub.displayName ?? status.accountName,
    email: pub.email ?? status.accountEmail,
    tenantId: pub.tenantId,
    missingCalendarConsent: pub.missingCalendarConsent,
    missingMailConsent: pub.missingMailConsent,
    configErrors: pub.configErrors,
    connectUrl: pub.connectUrl,
  });
}
