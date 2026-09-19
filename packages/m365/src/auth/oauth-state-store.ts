import { randomBytes } from "node:crypto";
import { readJsonFile, writeJsonFile } from "../storage/json-store";
import { microsoftAccountsPath } from "../storage/paths";
import path from "node:path";

export type PendingOAuthState = {
  sessionId: string;
  nonce: string;
  scopes: string[];
  expiresAt: number;
};

const TTL_MS = 10 * 60 * 1000;
const memory = new Map<string, PendingOAuthState>();

function oauthStatePath(): string {
  return path.join(path.dirname(microsoftAccountsPath()), "oauth-pending.json");
}

type OAuthStateFile = Record<string, PendingOAuthState>;

function loadFile(): OAuthStateFile {
  return readJsonFile(oauthStatePath(), {});
}

function saveFile(data: OAuthStateFile) {
  const now = Date.now();
  const pruned: OAuthStateFile = {};
  for (const [k, v] of Object.entries(data)) {
    if (v.expiresAt > now) pruned[k] = v;
  }
  writeJsonFile(oauthStatePath(), pruned);
}

function persistState(state: string, entry: PendingOAuthState) {
  memory.set(state, entry);
  const file = loadFile();
  file[state] = entry;
  saveFile(file);
}

function removeState(state: string) {
  memory.delete(state);
  const file = loadFile();
  delete file[state];
  saveFile(file);
}

export function createOAuthState(
  sessionId: string,
  scopes: string[],
  _consentKind?: string
): { state: string; nonce: string } {
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(16).toString("base64url");
  const entry: PendingOAuthState = {
    sessionId,
    nonce,
    scopes,
    expiresAt: Date.now() + TTL_MS,
  };
  persistState(state, entry);
  return { state, nonce };
}

export function consumeOAuthState(state: string): PendingOAuthState | null {
  let entry = memory.get(state);
  if (!entry) {
    const file = loadFile();
    entry = file[state];
  }
  if (!entry) return null;
  removeState(state);
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

export function clearOAuthStatesForSession(sessionId: string) {
  for (const [k, v] of memory) {
    if (v.sessionId === sessionId) memory.delete(k);
  }
  const file = loadFile();
  let changed = false;
  for (const [k, v] of Object.entries(file)) {
    if (v.sessionId === sessionId) {
      delete file[k];
      changed = true;
    }
  }
  if (changed) saveFile(file);
}

/** @internal test helper */
export function _resetOAuthStateStore() {
  memory.clear();
  saveFile({});
}
