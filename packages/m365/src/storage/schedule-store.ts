import fs from "node:fs";
import path from "node:path";
import type { CalendarAwareSchedule } from "@tuesday/core";
import { scheduleStorePath } from "./paths";

type ScheduleFile = Record<string, CalendarAwareSchedule>;

function readFile(): ScheduleFile {
  const p = scheduleStorePath();
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8")) as ScheduleFile;
}

function writeFile(data: ScheduleFile) {
  const p = scheduleStorePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

export function saveUserSchedule(userId: string, schedule: CalendarAwareSchedule) {
  const file = readFile();
  file[userId] = schedule;
  writeFile(file);
}

export function getUserSchedule(userId: string): CalendarAwareSchedule | null {
  return readFile()[userId] ?? null;
}

export function updateUserSchedule(
  userId: string,
  updater: (current: CalendarAwareSchedule | null) => CalendarAwareSchedule | null
): CalendarAwareSchedule | null {
  const file = readFile();
  const next = updater(file[userId] ?? null);
  if (!next) {
    delete file[userId];
  } else {
    file[userId] = next;
  }
  writeFile(file);
  return next;
}
