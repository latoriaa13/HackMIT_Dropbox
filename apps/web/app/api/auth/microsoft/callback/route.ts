import { NextResponse } from "next/server";
import {
  consumeOAuthState,
  exchangeCodeAndPersist,
  fetchMicrosoftProfile,
  isM365Configured,
  saveMicrosoftAccount,
  scopesForConsent,
} from "@tuesday/m365";
import {
  getSessionUserIdFromRequest,
  attachSessionCookie,
} from "@/lib/session";

function appBase(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function GET(request: Request) {
  const base = appBase(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");
  const state = url.searchParams.get("state");
  const req = request as import("next/server").NextRequest;
  const sessionId = getSessionUserIdFromRequest(req);

  if (error) {
    const reason =
      error === "access_denied" ? "oauth_cancelled" : encodeURIComponent(errorDesc ?? error);
    const res = NextResponse.redirect(`${base}/autopilot?error=${reason}`);
    attachSessionCookie(res, sessionId, req);
    return res;
  }

  if (!code || !state) {
    const res = NextResponse.redirect(`${base}/autopilot?error=oauth_denied`);
    attachSessionCookie(res, sessionId, req);
    return res;
  }

  if (!isM365Configured()) {
    const res = NextResponse.redirect(`${base}/autopilot?error=not_configured`);
    attachSessionCookie(res, sessionId, req);
    return res;
  }

  const pending = consumeOAuthState(state);
  if (!pending || pending.sessionId !== sessionId) {
    const res = NextResponse.redirect(`${base}/autopilot?error=invalid_oauth_state`);
    attachSessionCookie(res, sessionId, req);
    return res;
  }

  try {
    const scopes = pending.scopes.length ? pending.scopes : scopesForConsent("full");
    const result = await exchangeCodeAndPersist(sessionId, code, scopes);
    const profile = await fetchMicrosoftProfile(result.accessToken);
    const account = result.account;
    saveMicrosoftAccount({
      sessionUserId: sessionId,
      homeAccountId: account?.homeAccountId ?? profile.id,
      displayName: profile.displayName,
      email: profile.email || account?.username || "",
      tenantId: account?.tenantId ?? "common",
      grantedScopes: result.scopes?.length ? result.scopes : scopes,
      connectedAt: new Date().toISOString(),
    });
    const res = NextResponse.redirect(`${base}/autopilot?connected=1`);
    attachSessionCookie(res, sessionId, req);
    return res;
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "callback_failed");
    const res = NextResponse.redirect(`${base}/autopilot?error=${msg}`);
    attachSessionCookie(res, sessionId, req);
    return res;
  }
}
