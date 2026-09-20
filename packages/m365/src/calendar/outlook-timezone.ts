import { findIana } from "windows-iana";
import { DEFAULT_SCHEDULING_PREFERENCES } from "@tuesday/core";
import { getMicrosoftAccount, saveMicrosoftAccount } from "../auth/account-store";
import { getGraphAccessToken } from "../auth/ms-token-service";

export function windowsTimeZoneToIana(windowsOrIana: string): string {
  if (windowsOrIana.includes("/")) return windowsOrIana;
  const aliases = findIana(windowsOrIana);
  if (aliases.length > 0) return aliases[0];
  return DEFAULT_SCHEDULING_PREFERENCES.timezone;
}

export async function fetchMailboxWindowsTimeZone(sessionUserId: string): Promise<string | null> {
  try {
    const token = await getGraphAccessToken(sessionUserId, "user");
    const res = await fetch("https://graph.microsoft.com/v1.0/me/mailboxSettings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { timeZone?: string };
    return data.timeZone?.trim() || null;
  } catch {
    return null;
  }
}

export async function syncOutlookTimeZoneOnAccount(sessionUserId: string): Promise<string | null> {
  const windows = await fetchMailboxWindowsTimeZone(sessionUserId);
  if (!windows) return null;
  const account = getMicrosoftAccount(sessionUserId);
  if (account) {
    saveMicrosoftAccount({ ...account, outlookTimeZone: windows });
  }
  return windows;
}

/** Windows name for Graph Prefer header + IANA for scheduling math. */
export async function getOutlookTimeZoneContext(
  sessionUserId: string,
  override?: string
): Promise<{ windows: string; iana: string }> {
  if (override?.includes("/")) {
    return { windows: override, iana: override };
  }
  if (override) {
    return { windows: override, iana: windowsTimeZoneToIana(override) };
  }

  const account = getMicrosoftAccount(sessionUserId);
  let windows = account?.outlookTimeZone;
  if (!windows) {
    windows = (await syncOutlookTimeZoneOnAccount(sessionUserId)) ?? undefined;
  }
  if (!windows) {
    const iana = DEFAULT_SCHEDULING_PREFERENCES.timezone;
    return { windows: "Eastern Standard Time", iana };
  }
  return { windows, iana: windowsTimeZoneToIana(windows) };
}
