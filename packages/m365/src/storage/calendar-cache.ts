import fs from "node:fs";
import path from "node:path";
import type { CalendarEvent } from "../schemas/m365-schemas";
import { calendarCachePath } from "./paths";

type CalendarCacheFile = Record<
  string,
  {
    syncedAt: string;
    timezone: string;
    weekStart: string;
    weekEnd: string;
    events: CalendarEvent[];
  }
>;

function readFile(): CalendarCacheFile {
  const p = calendarCachePath();
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8")) as CalendarCacheFile;
}

function writeFile(data: CalendarCacheFile) {
  const p = calendarCachePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

export function saveCalendarWeekCache(
  userId: string,
  payload: {
    syncedAt: string;
    timezone: string;
    weekStart: string;
    weekEnd: string;
    events: CalendarEvent[];
  }
) {
  const file = readFile();
  file[userId] = payload;
  writeFile(file);
}

export function getCalendarWeekCache(userId: string) {
  return readFile()[userId] ?? null;
}

/** Prefer this user's cache; else any non-empty cached week (saved real Outlook data). */
export function getBestCalendarWeekFallback(userId: string) {
  const file = readFile();
  const own = file[userId];
  if (own?.events?.length) return own;
  for (const entry of Object.values(file)) {
    if (entry?.events?.length) return entry;
  }
  return null;
}
