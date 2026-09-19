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
  verifySessionCookie,
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

  function redirectWithSession(path: string, sessionId?: string) {
    const res = NextResponse.redirect(`${base}${path}`);
    if (sessionId) attachSessionCookie(res, sessionId, req);
    return res;
  }

  if (error) {
    const reason =
      error === "access_denied" ? "oauth_cancelled" : encodeURIComponent(errorDesc ?? error);
    return redirectWithSession(`/autopilot?error=${reason}`);
  }

  if (!code || !state) {
    return redirectWithSession("/autopilot?error=oauth_denied");
  }

  if (!isM365Configured()) {
    return redirectWithSession("/autopilot?error=not_configured");
  }

  const pending = consumeOAuthState(state);
  if (!pending) {
    return redirectWithSession("/autopilot?error=invalid_oauth_state");
  }

  const cookieSession = verifySessionCookie(req.cookies.get("tuesday_session")?.value);
  if (cookieSession && cookieSession !== pending.sessionId) {
    return redirectWithSession("/autopilot?error=invalid_oauth_state");
  }
  const sessionId = pending.sessionId;

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
    return redirectWithSession("/autopilot?connected=1", sessionId);
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "callback_failed");
    return redirectWithSession(`/autopilot?error=${msg}`, sessionId);
  }
}
