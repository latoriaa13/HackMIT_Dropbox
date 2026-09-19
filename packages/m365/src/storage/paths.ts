import path from "node:path";

export function automationDataDir(): string {
  const root = process.env.TUESDAY_DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  return path.join(root, "automation");
}

export function tokensPath(): string {
  return path.join(automationDataDir(), "tokens.json");
}

export function tasksPath(): string {
  return path.join(automationDataDir(), "tasks.json");
}

export function auditPath(): string {
  return path.join(automationDataDir(), "audit.json");
}

export function draftsPath(): string {
  return path.join(automationDataDir(), "pending-drafts.json");
}

export function activityPath(): string {
  return path.join(automationDataDir(), "constituent-activity.json");
}

export function microsoftAccountsPath(): string {
  return path.join(automationDataDir(), "microsoft-accounts.json");
}

export function msalCachePath(): string {
  return path.join(automationDataDir(), "msal-encrypted-cache.json");
}
