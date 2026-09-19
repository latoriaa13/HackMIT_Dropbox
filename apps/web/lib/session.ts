import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE = "tuesday_session";
const MAX_AGE = 60 * 60 * 24 * 14;

function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  return "dev-only-session-secret-not-for-production";
}

function sign(sessionId: string): string {
  const sig = createHmac("sha256", sessionSecret()).update(sessionId).digest("base64url");
  return `${sessionId}.${sig}`;
}

export function verifySessionCookie(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const sessionId = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", sessionSecret()).update(sessionId).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return sessionId;
}

export function newSessionId(): string {
  return randomBytes(24).toString("base64url");
}

export function buildSessionCookieValue(sessionId: string): string {
  return sign(sessionId);
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: MAX_AGE,
  };
}

/** Read-only session lookup for Server Components and other render paths. Never mutates cookies. */
export async function getServerSession(): Promise<{ sessionId: string | null }> {
  const jar = await cookies();
  const sessionId = verifySessionCookie(jar.get(COOKIE)?.value);
  return { sessionId };
}

/**
 * Creates or resumes a signed session cookie. Call only from Route Handlers or Server Actions.
 */
export async function ensureServerSession(): Promise<string> {
  const jar = await cookies();
  const verified = verifySessionCookie(jar.get(COOKIE)?.value);
  if (verified) return verified;
  const id = newSessionId();
  jar.set(COOKIE, buildSessionCookieValue(id), sessionCookieOptions(process.env.NODE_ENV === "production"));
  return id;
}

/** Route Handlers: returns session id, creating a signed cookie when missing. */
export async function getSessionUserId(): Promise<string> {
  return ensureServerSession();
}

export function getSessionUserIdFromRequest(request: NextRequest): string {
  const verified = verifySessionCookie(request.cookies.get(COOKIE)?.value);
  if (verified) return verified;
  return newSessionId();
}

export function attachSessionCookie(response: NextResponse, sessionId: string, request: NextRequest) {
  const secure = request.nextUrl.protocol === "https:";
  response.cookies.set(COOKIE, buildSessionCookieValue(sessionId), sessionCookieOptions(secure));
}

/** Ensures the response carries a session cookie (Route Handlers only). */
export function ensureSessionCookieOnResponse(request: NextRequest, response: NextResponse): string {
  const verified = verifySessionCookie(request.cookies.get(COOKIE)?.value);
  if (verified) return verified;
  const id = newSessionId();
  attachSessionCookie(response, id, request);
  return id;
}
