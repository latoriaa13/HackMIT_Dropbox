import { NextResponse } from "next/server";
import { isMicrosoft365Connected, resolveConnectionStatus } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function GET(request: Request) {
  const sessionUserId = await getSessionUserId();
  const url = new URL(request.url);
  const verify = url.searchParams.get("verify") === "1";
  const forceProbe = url.searchParams.get("verify") === "1";

  if (!isMicrosoft365Connected(sessionUserId)) {
    const resolved = await resolveConnectionStatus(sessionUserId, { verify: false });
    const pub = resolved.pub;
    return NextResponse.json({
      connected: false,
      accountLinked: false,
      outlookReady: false,
      mailAutopilotReady: false,
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
      missingCalendarConsent: true,
      missingMailConsent: true,
      verified: false,
    });
  }

  const resolved = await resolveConnectionStatus(sessionUserId, { verify, forceProbe });
  const pub = resolved.pub;
  const probe = resolved.probe;
  const email = pub.email ?? "";
  const isGuestExternal = email.includes("#EXT#") || email.includes("#ext#");

  return NextResponse.json({
    connected: resolved.connected,
    accountLinked: resolved.accountLinked,
    isGuestExternalAccount: isGuestExternal,
    outlookReady: resolved.outlookReady,
    mailAutopilotReady: resolved.mailAutopilotReady,
    profileReady: resolved.profileReady,
    calendarReady: resolved.calendarReady,
    mailReady: resolved.mailReady,
    mailReadReady: resolved.mailReadReady,
    verified: resolved.verified,
    mode: "microsoft_graph",
    accountEmail: pub.email ?? null,
    accountName: pub.displayName ?? null,
    grantedScopes: resolved.grantedScopes,
    configured: pub.oauthConfigured,
    message: isGuestExternal
      ? "This Microsoft sign-in can't send email. Disconnect, then use Connect personal Outlook and choose your @outlook.com account."
      : resolved.outlookReady
        ? "Your Outlook calendar is connected. Your weekly plan uses your real availability."
        : resolved.mailAutopilotReady
          ? "Your email is connected. Connect calendar on the home page to build a schedule around Outlook."
          : resolved.accountLinked
            ? "You're signed in to Microsoft. Connect personal Outlook (email) to send from Autopilot."
            : pub.message,
    oauthConfigured: pub.oauthConfigured,
    canStartOAuth: pub.canStartOAuth,
    provider: pub.provider,
    displayName: pub.displayName,
    email: pub.email,
    tenantId: pub.tenantId,
    missingCalendarConsent: resolved.missingCalendarConsent,
    missingMailConsent: resolved.missingMailConsent,
    capabilityErrors: resolved.capabilityErrors,
    graphErrorCodes: probe?.graphErrorCodes ?? null,
    microsoftIdentity: probe?.identity ?? null,
    calendarNotReadyReason: resolved.capabilityErrors.calendar ?? null,
    mailNotReadyReason: resolved.capabilityErrors.mail ?? null,
    capabilitiesCheckedAt: probe?.checkedAt ?? null,
    configErrors: pub.configErrors,
    connectUrl: pub.connectUrl,
  });
}
