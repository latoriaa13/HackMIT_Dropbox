import { msalCachePath, readJsonFile, writeJsonFile } from "../storage/json-store";
import { decryptPayload, encryptPayload } from "./crypto";

/** Encrypted MSAL token cache blobs — no plaintext access tokens on disk. */
type CacheFile = Record<string, string>;

function load(): CacheFile {
  return readJsonFile<CacheFile>(msalCachePath(), {});
}

function save(data: CacheFile) {
  writeJsonFile(msalCachePath(), data);
}

export function readMsalCacheSerialized(sessionUserId: string): string | null {
  const enc = load()[sessionUserId];
  if (!enc) return null;
  try {
    return decryptPayload(enc);
  } catch {
    return null;
  }
}

export function writeMsalCacheSerialized(sessionUserId: string, serialized: string) {
  const all = load();
  all[sessionUserId] = encryptPayload(serialized);
  save(all);
}

export function clearMsalCache(sessionUserId: string) {
  const all = load();
  delete all[sessionUserId];
  save(all);
}
