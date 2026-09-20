import type { MicrosoftAccountLink } from "./account-store";
import { clearMsalCache, readMsalCacheSerialized, writeMsalCacheSerialized } from "./msal-cache-store";
import fs from "node:fs";
import { calendarCachePath } from "../storage/paths";
import { getCalendarWeekCache, saveCalendarWeekCache } from "../storage/calendar-cache";
import { microsoftAccountsPath, readJsonFile, writeJsonFile } from "../storage/json-store";

type AccountFile = Record<string, MicrosoftAccountLink>;

/**
 * Local dev: browser session cookie often changes (port swap, new tab) while Microsoft
 * tokens stay under an older session id. Relink the single stored account + MSAL cache.
 */
export function relinkDevMicrosoftSession(currentSessionUserId: string): MicrosoftAccountLink | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (currentSessionUserId.startsWith("user-")) return null;

  const path = microsoftAccountsPath();
  const all = readJsonFile<AccountFile>(path, {});
  if (all[currentSessionUserId]) return all[currentSessionUserId];

  const keys = Object.keys(all);
  if (keys.length !== 1) return null;

  const oldSessionId = keys[0]!;
  const link = all[oldSessionId];
  if (!link) return null;

  const msal = readMsalCacheSerialized(oldSessionId);
  if (msal) {
    writeMsalCacheSerialized(currentSessionUserId, msal);
    clearMsalCache(oldSessionId);
  }

  const cachedWeek = getCalendarWeekCache(oldSessionId);
  if (cachedWeek) {
    saveCalendarWeekCache(currentSessionUserId, cachedWeek);
    const cachePath = calendarCachePath();
    if (fs.existsSync(cachePath)) {
      const file = JSON.parse(fs.readFileSync(cachePath, "utf8")) as Record<string, unknown>;
      delete file[oldSessionId];
      fs.writeFileSync(cachePath, JSON.stringify(file, null, 2));
    }
  }

  const relinked: MicrosoftAccountLink = { ...link, sessionUserId: currentSessionUserId };
  delete all[oldSessionId];
  all[currentSessionUserId] = relinked;
  writeJsonFile(path, all);

  return relinked;
}
