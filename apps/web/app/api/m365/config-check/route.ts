import { NextResponse } from "next/server";
import { getOAuthConfigErrors, isM365Configured } from "@tuesday/m365";

/** Safe diagnostics — never returns secret values. */
export async function GET() {
  return NextResponse.json({
    oauthConfigured: isM365Configured(),
    hasClientId: Boolean(process.env.MICROSOFT_CLIENT_ID?.trim()),
    hasClientSecret: Boolean(process.env.MICROSOFT_CLIENT_SECRET?.trim()),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET?.trim()),
    tenantId: process.env.MICROSOFT_TENANT_ID ?? "(default common)",
    redirectUri: process.env.MICROSOFT_REDIRECT_URI ?? "(default localhost callback)",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "(not set)",
    configErrors: getOAuthConfigErrors(),
    cwd: process.cwd(),
  });
}
