import { NextResponse } from "next/server";
import {
  createOAuthState,
  getAuthCodeUrl,
  canStartMicrosoftOAuth,
  scopesForIncrementalConsent,
  getMicrosoftAccount,
  type ConsentKind,
  authoritySegmentForAccountKind,
  parseAccountKindParam,
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
  const reauth = url.searchParams.get("reauth") === "1";
  const pickAccount = url.searchParams.get("pickAccount") === "1";
  const accountKind = parseAccountKindParam(url.searchParams.get("accountKind"));
  const authAuthoritySegment = authoritySegmentForAccountKind(accountKind);
  let prompt: "consent" | "select_account" | "login";
  if (reauth) {
    prompt = "login";
  } else if (!existing || pickAccount) {
    // Avoid silently reusing a cached Microsoft session (e.g. #EXT# guest) when the user expects to pick an account.
    prompt = "select_account";
  } else if (consent === "calendar" || consent === "mail") {
    prompt = "consent";
  } else if (consent === "basic") {
    prompt = "select_account";
  } else {
    prompt = "consent";
  }

  try {
    const { state, nonce } = createOAuthState(sessionId, scopeList, {
      consentKind: consent,
      returnTo,
      authAuthoritySegment,
    });
    const authorizeUrl = await getAuthCodeUrl({
      state,
      nonce,
      scopes: scopeList,
      prompt,
      authoritySegment: authAuthoritySegment,
    });
    const res = NextResponse.redirect(authorizeUrl);
    attachSessionCookie(res, sessionId, req);
    return res;
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "OAuth failed");
    return NextResponse.redirect(`${base}${returnTo}?error=${msg}`);
  }
}
