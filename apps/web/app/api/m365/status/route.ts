import { NextResponse } from "next/server";
import {
  getPublicM365Session,
  isMicrosoft365Connected,
  probeGraphCapabilities,
  connectionFlagsFromProbe,
} from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function GET(request: Request) {
  const sessionUserId = await getSessionUserId();
  const pub = getPublicM365Session(sessionUserId);
  const url = new URL(request.url);
  const forceProbe = url.searchParams.get("verify") === "1";

  if (!isMicrosoft365Connected(sessionUserId)) {
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
    });
  }

  const probe = await probeGraphCapabilities(sessionUserId, { force: forceProbe });
  const flags = connectionFlagsFromProbe(probe, true);

  return NextResponse.json({
    connected: flags.outlookReady,
    accountLinked: true,
    outlookReady: flags.outlookReady,
    mailAutopilotReady: flags.mailAutopilotReady,
    profileReady: flags.profileReady,
    calendarReady: flags.calendarReady,
    mailReady: flags.mailReady,
    mailReadReady: flags.mailReadReady,
    mode: "microsoft_graph",
    accountEmail: pub.email ?? null,
    accountName: pub.displayName ?? null,
    grantedScopes: probe.tokenScopes.length ? probe.tokenScopes : pub.grantedScopes ?? [],
    configured: pub.oauthConfigured,
    message: flags.outlookReady
      ? "Outlook calendar verified — schedule and availability use live Graph data."
      : flags.mailAutopilotReady
        ? "Mail verified — calendar still needs Connect calendar."
        : "Microsoft account linked — grant calendar and/or mail permissions to unlock features.",
    oauthConfigured: pub.oauthConfigured,
    canStartOAuth: pub.canStartOAuth,
    provider: pub.provider,
    displayName: pub.displayName,
    email: pub.email,
    tenantId: pub.tenantId,
    missingCalendarConsent: flags.missingCalendarConsent,
    missingMailConsent: flags.missingMailConsent,
    capabilityErrors: probe.errors,
    calendarNotReadyReason: probe.errors.calendar ?? null,
    mailNotReadyReason: probe.errors.mail ?? null,
    capabilitiesCheckedAt: probe.checkedAt,
    configErrors: pub.configErrors,
    connectUrl: pub.connectUrl,
  });
}
