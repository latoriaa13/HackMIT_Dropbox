import { microsoftAccountsPath, readJsonFile, writeJsonFile } from "../storage/json-store";
import { relinkDevMicrosoftSession } from "./dev-session-relink";

export type MicrosoftAccountLink = {
  sessionUserId: string;
  homeAccountId: string;
  displayName: string;
  email: string;
  tenantId: string;
  /** login.microsoftonline.com tenant segment used at sign-in (e.g. consumers, organizations, common). */
  authAuthoritySegment?: string;
  grantedScopes: string[];
  connectedAt: string;
  /** Outlook mailbox timezone (Windows name from Graph mailboxSettings). */
  outlookTimeZone?: string;
};

type AccountFile = Record<string, MicrosoftAccountLink>;

function load(): AccountFile {
  return readJsonFile(microsoftAccountsPath(), {});
}

function save(data: AccountFile) {
  writeJsonFile(microsoftAccountsPath(), data);
}

export function getMicrosoftAccount(sessionUserId: string): MicrosoftAccountLink | null {
  const direct = load()[sessionUserId];
  if (direct) return direct;
  return relinkDevMicrosoftSession(sessionUserId);
}

export function saveMicrosoftAccount(link: MicrosoftAccountLink) {
  const all = load();
  all[link.sessionUserId] = link;
  save(all);
}

export function clearMicrosoftAccount(sessionUserId: string) {
  const all = load();
  delete all[sessionUserId];
  save(all);
}

export function hasMicrosoftConnection(sessionUserId: string): boolean {
  return !!getMicrosoftAccount(sessionUserId);
}
