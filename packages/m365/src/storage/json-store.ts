import fs from "node:fs";
import path from "node:path";

export {
  automationDataDir,
  tokensPath,
  tasksPath,
  auditPath,
  draftsPath,
  activityPath,
  microsoftAccountsPath,
  msalCachePath,
} from "./paths";

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile<T>(filePath: string, data: T) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
