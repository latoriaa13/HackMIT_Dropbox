import { NextResponse } from "next/server";
import {
  createOAuthState,
  getAuthCodeUrl,
  canStartMicrosoftOAuth,
  scopesForIncrementalConsent,
  getMicrosoftAccount,
  type ConsentKind,
} from "@tuesday/m365";
import {
  attachSessionCookie,
  getSessionUserIdFromRequest,
  verifySessionCookie,
} from "@/lib/session";
import { safeReturnPath } from "@/lib/m365-connect";

function appBase(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function GET(request: Request) {
  const base = appBase(request);
  if (!canStartMicrosoftOAuth()) {
    return NextResponse.redirect(`${base}/?error=not_configured`);
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

  const returnTo = safeReturnPath(
    url.searchParams.get("returnTo"),
    consent === "full" ? "/" : "/autopilot"
  );

  const existing = getMicrosoftAccount(sessionId);
  const scopeList = scopesForIncrementalConsent(consent, existing?.grantedScopes);
  const prompt = consent === "basic" && existing ? "select_account" : "consent";

  try {
    const { state, nonce } = createOAuthState(sessionId, scopeList, {
      consentKind: consent,
      returnTo,
    });
    const authorizeUrl = await getAuthCodeUrl({
      state,
      nonce,
      scopes: scopeList,
      prompt,
    });
    const res = NextResponse.redirect(authorizeUrl);
    attachSessionCookie(res, sessionId, req);
    return res;
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "OAuth failed");
    return NextResponse.redirect(`${base}${returnTo}?error=${msg}`);
  }
}
