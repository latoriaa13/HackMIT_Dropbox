import { randomUUID } from "node:crypto";
import { auditPath, readJsonFile, writeJsonFile } from "./json-store";

export type AutomationAuditLog = {
  id: string;
  taskId?: string;
  userId: string;
  actionType: string;
  target: string;
  status: "drafted" | "approved" | "rejected" | "executed" | "failed";
  payloadSummary: string;
  createdAt: string;
  executedAt?: string;
  error?: string;
};

export function appendAudit(entry: Omit<AutomationAuditLog, "id" | "createdAt">) {
  const logs = readJsonFile<AutomationAuditLog[]>(auditPath(), []);
  logs.unshift({
    ...entry,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  });
  writeJsonFile(auditPath(), logs.slice(0, 500));
}

export function listAudit(userId: string, limit = 50): AutomationAuditLog[] {
  return readJsonFile<AutomationAuditLog[]>(auditPath(), [])
    .filter((l) => l.userId === userId)
    .slice(0, limit);
}
