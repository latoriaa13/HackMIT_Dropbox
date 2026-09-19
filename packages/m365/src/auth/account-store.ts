import { microsoftAccountsPath, readJsonFile, writeJsonFile } from "../storage/json-store";

export type MicrosoftAccountLink = {
  sessionUserId: string;
  homeAccountId: string;
  displayName: string;
  email: string;
  tenantId: string;
  grantedScopes: string[];
  connectedAt: string;
};

type AccountFile = Record<string, MicrosoftAccountLink>;

function load(): AccountFile {
  return readJsonFile(microsoftAccountsPath(), {});
}

function save(data: AccountFile) {
  writeJsonFile(microsoftAccountsPath(), data);
}

export function getMicrosoftAccount(sessionUserId: string): MicrosoftAccountLink | null {
  return load()[sessionUserId] ?? null;
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
