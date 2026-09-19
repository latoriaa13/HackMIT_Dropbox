import { randomUUID } from "node:crypto";
import type { AutomationTask } from "./task-model";
import { tasksPath, readJsonFile, writeJsonFile } from "../storage/json-store";

export function listTasks(userId: string): AutomationTask[] {
  return readJsonFile<AutomationTask[]>(tasksPath(), []).filter((t) => t.userId === userId);
}

export function getTask(id: string, userId: string): AutomationTask | null {
  return listTasks(userId).find((t) => t.id === id) ?? null;
}

export function saveTask(task: AutomationTask) {
  const all = readJsonFile<AutomationTask[]>(tasksPath(), []);
  const idx = all.findIndex((t) => t.id === task.id);
  if (idx >= 0) all[idx] = task;
  else all.unshift(task);
  writeJsonFile(tasksPath(), all);
}

export function createTask(
  userId: string,
  partial: Omit<AutomationTask, "id" | "userId" | "createdAt" | "updatedAt" | "status"> & {
    status?: AutomationTask["status"];
  }
): AutomationTask {
  const now = new Date().toISOString();
  const task: AutomationTask = {
    id: randomUUID(),
    userId,
    status: partial.status ?? "scheduled",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
  saveTask(task);
  return task;
}

export function updateTaskStatus(
  id: string,
  userId: string,
  status: AutomationTask["status"],
  patch?: Partial<AutomationTask>
) {
  const task = getTask(id, userId);
  if (!task) return null;
  const updated = { ...task, ...patch, status, updatedAt: new Date().toISOString() };
  saveTask(updated);
  return updated;
}
