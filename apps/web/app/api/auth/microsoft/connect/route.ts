import { NextResponse } from "next/server";
import {
  createOAuthState,
  getAuthCodeUrl,
  isM365Configured,
  getOAuthConfigErrors,
  scopesForConsent,
  type ConsentKind,
} from "@tuesday/m365";
import {
  attachSessionCookie,
  getSessionUserIdFromRequest,
  verifySessionCookie,
} from "@/lib/session";

function appBase(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function GET(request: Request) {
  const base = appBase(request);
  if (!isM365Configured()) {
    return NextResponse.redirect(`${base}/autopilot?error=not_configured`);
  }
  const configErrors = getOAuthConfigErrors();
  if (configErrors.length) {
    const msg = encodeURIComponent(configErrors.join("; "));
    return NextResponse.redirect(`${base}/autopilot?error=${msg}`);
  }

  const req = request as import("next/server").NextRequest;
  const verified = verifySessionCookie(req.cookies.get("tuesday_session")?.value);
  const sessionId = verified ?? getSessionUserIdFromRequest(req);
  const url = new URL(request.url);
  const consentParam = url.searchParams.get("consent");
  const consent: ConsentKind =
    consentParam === "calendar" || consentParam === "mail" || consentParam === "basic"
      ? consentParam
      : "full";

  try {
    const scopeList = scopesForConsent(consent);
    const { state, nonce } = createOAuthState(sessionId, scopeList, consent);
    const authorizeUrl = await getAuthCodeUrl({ state, nonce, consent });
    const res = NextResponse.redirect(authorizeUrl);
    attachSessionCookie(res, sessionId, req);
    return res;
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "OAuth failed");
    return NextResponse.redirect(`${base}/autopilot?error=${msg}`);
  }
}
