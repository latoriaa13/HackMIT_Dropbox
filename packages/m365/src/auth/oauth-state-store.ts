import { randomBytes } from "node:crypto";

export type PendingOAuthState = {
  sessionId: string;
  nonce: string;
  scopes: string[];
  expiresAt: number;
};

const TTL_MS = 10 * 60 * 1000;
const memory = new Map<string, PendingOAuthState>();

export function createOAuthState(
  sessionId: string,
  scopes: string[],
  consentKind?: string
): { state: string; nonce: string } {
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(16).toString("base64url");
  memory.set(state, {
    sessionId,
    nonce,
    scopes,
    expiresAt: Date.now() + TTL_MS,
    ...(consentKind ? { consentKind } : {}),
  } as PendingOAuthState);
  return { state, nonce };
}

export function consumeOAuthState(state: string): PendingOAuthState | null {
  const entry = memory.get(state);
  if (!entry) return null;
  memory.delete(state);
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

export function clearOAuthStatesForSession(sessionId: string) {
  for (const [k, v] of memory) {
    if (v.sessionId === sessionId) memory.delete(k);
  }
}

/** @internal test helper */
export function _resetOAuthStateStore() {
  memory.clear();
}
