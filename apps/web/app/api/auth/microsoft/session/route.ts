import { NextResponse } from "next/server";
import {
  getPublicM365Session,
  isMicrosoft365Connected,
  probeGraphCapabilities,
  connectionFlagsFromProbe,
} from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

/** Same capability-aware session shape as GET /api/m365/status (for queue Autopilot widgets). */
export async function GET() {
  const sessionUserId = await getSessionUserId();
  const pub = getPublicM365Session(sessionUserId);
  if (!isMicrosoft365Connected(sessionUserId)) {
    return NextResponse.json({
      ...pub,
      connected: false,
      accountLinked: false,
      outlookReady: false,
      mailAutopilotReady: false,
    });
  }
  const probe = await probeGraphCapabilities(sessionUserId);
  const flags = connectionFlagsFromProbe(probe, true);
  return NextResponse.json({
    ...pub,
    connected: flags.mailAutopilotReady || flags.outlookReady,
    accountLinked: true,
    outlookReady: flags.outlookReady,
    mailAutopilotReady: flags.mailAutopilotReady,
    calendarReady: flags.calendarReady,
    mailReady: flags.mailReady,
    missingCalendarConsent: flags.missingCalendarConsent,
    missingMailConsent: flags.missingMailConsent,
    capabilityErrors: probe.errors,
    grantedScopes: probe.tokenScopes.length ? probe.tokenScopes : pub.grantedScopes,
  });
}
