/**
 * Run from repo root: npx tsx scripts/debug-m365-connection.ts [sessionUserId]
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function hit(label: string, url: string, token: string) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await r.text();
  console.log(label, r.status, text.slice(0, 250));
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const envPath = path.join(root, ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  }

  process.chdir(path.join(root, "apps/web"));

  const { getMicrosoftAccount } = await import("../packages/m365/src/auth/account-store");
  const { getGraphAccessToken } = await import("../packages/m365/src/auth/ms-token-service");

  const accountsPath = path.join(root, "data/automation/microsoft-accounts.json");
  const all = JSON.parse(readFileSync(accountsPath, "utf8")) as Record<string, unknown>;
  const sessionId = process.argv[2] ?? Object.keys(all)[0] ?? "";

  console.log("account email:", getMicrosoftAccount(sessionId)?.email);

  const userT = await getGraphAccessToken(sessionId, "user", { forceRefresh: true });
  const calT = await getGraphAccessToken(sessionId, "calendar", { forceRefresh: true });
  const mailT = await getGraphAccessToken(sessionId, "mail", { forceRefresh: true });

  const calQ =
    "https://graph.microsoft.com/v1.0/me/calendarView?" +
    new URLSearchParams({
      startDateTime: "2026-09-21T00:00:00Z",
      endDateTime: "2026-09-26T23:59:59Z",
      $top: "2",
    });

  await hit("user+me", "https://graph.microsoft.com/v1.0/me", userT);
  await hit("cal+me", "https://graph.microsoft.com/v1.0/me", calT);
  await hit("user+calendarView", calQ, userT);
  await hit("cal+calendarView", calQ, calT);
  await hit("mail+messages", "https://graph.microsoft.com/v1.0/me/messages?$top=1", mailT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
