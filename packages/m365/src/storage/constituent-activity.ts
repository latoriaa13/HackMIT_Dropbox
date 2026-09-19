import { randomUUID } from "node:crypto";
import { activityPath, readJsonFile, writeJsonFile } from "./json-store";

export type ConstituentActivityRecord = {
  id: string;
  constituentId: string;
  userId: string;
  type: "email_draft" | "email_sent" | "event_draft" | "event_sent" | "task_run" | "note";
  summary: string;
  at: string;
  status: string;
};

export function recordConstituentActivity(
  entry: Omit<ConstituentActivityRecord, "id" | "at">
) {
  const all = readJsonFile<ConstituentActivityRecord[]>(activityPath(), []);
  all.unshift({
    ...entry,
    id: randomUUID(),
    at: new Date().toISOString(),
  });
  writeJsonFile(activityPath(), all.slice(0, 2000));
}

export function listConstituentActivity(constituentId: string, userId: string) {
  return readJsonFile<ConstituentActivityRecord[]>(activityPath(), []).filter(
    (a) => a.constituentId === constituentId && a.userId === userId
  );
}
