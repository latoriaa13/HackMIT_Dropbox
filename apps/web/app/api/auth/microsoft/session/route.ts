import { NextResponse } from "next/server";
import { resolveConnectionStatus } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

/** Session shape for queue Autopilot widgets. Default is grant-based (fast); ?verify=1 live-checks Outlook. */
export async function GET(request: Request) {
  const sessionUserId = await getSessionUserId();
  const verify = new URL(request.url).searchParams.get("verify") === "1";
  const resolved = await resolveConnectionStatus(sessionUserId, { verify, forceProbe: verify });
  const pub = resolved.pub;

  return NextResponse.json({
    ...pub,
    connected: resolved.connected,
    accountLinked: resolved.accountLinked,
    outlookReady: resolved.outlookReady,
    mailAutopilotReady: resolved.mailAutopilotReady,
    calendarReady: resolved.calendarReady,
    mailReady: resolved.mailReady,
    missingCalendarConsent: resolved.missingCalendarConsent,
    missingMailConsent: resolved.missingMailConsent,
    capabilityErrors: resolved.capabilityErrors,
    grantedScopes: resolved.grantedScopes,
    verified: resolved.verified,
  });
}
