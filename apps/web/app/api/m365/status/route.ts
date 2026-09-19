import { NextResponse } from "next/server";
import { getMicrosoft365Provider, getPublicM365Session } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const sessionUserId = await getSessionUserId();
  const pub = getPublicM365Session(sessionUserId);
  const provider = getMicrosoft365Provider(sessionUserId);
  const status = await provider.getConnectionStatus();
  return NextResponse.json({
    ...status,
    oauthConfigured: pub.oauthConfigured,
    provider: pub.provider,
    displayName: pub.displayName ?? status.accountName,
    email: pub.email ?? status.accountEmail,
    tenantId: pub.tenantId,
    missingCalendarConsent: pub.missingCalendarConsent,
    missingMailConsent: pub.missingMailConsent,
    configErrors: pub.configErrors,
  });
}
