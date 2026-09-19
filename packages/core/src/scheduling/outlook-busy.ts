import type { OutlookBusyBlock } from "./types";

/** Graph showAs values that should not block fundraising task placement. */
export function isBlockingOutlookEvent(ev: OutlookBusyBlock): boolean {
  if (ev.isAllDay) return true;
  const show = (ev.showAs ?? "busy").toLowerCase();
  return show !== "free";
}

export function outlookEventDisplayLabel(ev: OutlookBusyBlock): string {
  if (ev.isPrivate) return "Busy / private event";
  const show = ev.showAs?.toLowerCase();
  if (show === "oof") return `Out of office · ${ev.subject}`;
  if (show === "workingelsewhere") return `Working elsewhere · ${ev.subject}`;
  if (show === "tentative") return `Tentative · ${ev.subject}`;
  if (show === "free") return `Free · ${ev.subject}`;
  return ev.subject || "Busy";
}
