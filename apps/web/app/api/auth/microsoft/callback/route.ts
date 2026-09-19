import { NextResponse } from "next/server";
import {
  consumeOAuthState,
  exchangeCodeAndPersist,
  fetchMicrosoftProfile,
  isM365Configured,
  saveMicrosoftAccount,
  getMicrosoftAccount,
  mergeGrantedScopes,
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
    const desc = errorDesc ?? error;
    let reason = "oauth_token_exchange_failed";
    if (error === "access_denied") reason = "oauth_cancelled";
    else if (desc.includes("invalid_client") || desc.includes("AADSTS7000215")) {
      reason = "oauth_invalid_client";
    } else if (error !== "invalid_client") {
      reason = encodeURIComponent(desc);
    } else {
      reason = "oauth_invalid_client";
    }
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
    const prior = getMicrosoftAccount(sessionId);
    const fromToken = result.scopes?.length ? result.scopes : scopes;
    saveMicrosoftAccount({
      sessionUserId: sessionId,
      homeAccountId: account?.homeAccountId ?? profile.id,
      displayName: profile.displayName,
      email: profile.email || account?.username || "",
      tenantId: account?.tenantId ?? "common",
      grantedScopes: mergeGrantedScopes(prior?.grantedScopes, fromToken),
      connectedAt: prior?.connectedAt ?? new Date().toISOString(),
    });

    const returnTo = pending.returnTo?.startsWith("/") ? pending.returnTo : "/autopilot";
    const qs = new URLSearchParams();
    if (pending.consentKind === "calendar") qs.set("calendar_connected", "1");
    else if (pending.consentKind === "mail") qs.set("mail_connected", "1");
    else qs.set("connected", "1");
    return redirectWithSession(`${returnTo}?${qs.toString()}`, sessionId);
  } catch (e) {
    const raw = e instanceof Error ? e.message : "callback_failed";
    const reason =
      raw.includes("invalid_client") || raw.includes("AADSTS7000215")
        ? "oauth_invalid_client"
        : "oauth_token_exchange_failed";
    return redirectWithSession(`/autopilot?error=${reason}`, sessionId);
  }
}
