"use client";

import { useEffect, useState } from "react";
import type { QueueItem } from "@tuesday/core";
import { markMicrosoftOAuthAttempt } from "@/lib/oauth-errors";

type M365Session = {
  connected: boolean;
  canStartOAuth?: boolean;
  configurationError?: boolean;
  missingCalendarConsent?: boolean;
  missingMailConsent?: boolean;
  connectUrl?: string;
  message?: string;
};

export function QueueAutopilotActions({ item }: { item: QueueItem }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [m365, setM365] = useState<M365Session | null>(null);
  const [slots, setSlots] = useState<Array<{ start: string; end: string }>>([]);

  useEffect(() => {
    fetch("/api/auth/microsoft/session")
      .then((r) => r.json())
      .then(setM365);
  }, []);

  const connected = m365?.connected === true;
  const canMail = connected && !m365?.missingMailConsent;
  const canCalendar = connected && !m365?.missingCalendarConsent;

  const draftEmail = async () => {
    if (!canMail) {
      setMsg(m365?.message ?? "Microsoft 365 connection required for email drafts.");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/automation/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constituentId: item.constituentId,
          recommendedAction: item.recommendedAction,
          whyNow: item.whyNow,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Failed");
      setMsg("Email draft ready — approve in Autopilot inbox.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const findTime = async () => {
    if (!canCalendar) {
      setMsg(m365?.message ?? "Calendar access required — connect Microsoft 365.");
      return;
    }
    setLoading(true);
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 86400000);
    try {
      const res = await fetch("/api/m365/calendar/free-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: now.toISOString(),
          end: end.toISOString(),
          durationMinutes: 30,
          timezone: "America/New_York",
          workingHoursStart: 9,
          workingHoursEnd: 17,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Failed");
      setSlots(data.slots?.slice(0, 5) ?? []);
      setMsg("Available slots from your Microsoft calendar — select one to draft an event.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (m365?.configurationError) {
    return (
      <div className="mt-3 border-t pt-3 text-xs text-amber-900">
        Microsoft Entra is not configured on this server. Set MICROSOFT_CLIENT_ID in `.env.local`.
      </div>
    );
  }

  if (m365 && !connected) {
    return (
      <div className="mt-3 border-t pt-3">
        <p className="text-xs font-semibold uppercase text-[var(--muted)]">Autopilot</p>
        <p className="mt-1 text-xs text-amber-900">Microsoft 365 connection required.</p>
        <a
          href={m365.connectUrl ?? "/api/auth/microsoft/connect"}
          onClick={() => markMicrosoftOAuthAttempt()}
          className="mt-2 inline-block rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white"
        >
          Connect Microsoft 365
        </a>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">Autopilot · Microsoft Graph</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || !canMail}
          onClick={draftEmail}
          className="rounded-lg border px-2 py-1 text-xs hover:bg-stone-50 disabled:opacity-50"
        >
          Draft follow-up email
        </button>
        <button
          type="button"
          disabled={loading || !canCalendar}
          onClick={findTime}
          className="rounded-lg border px-2 py-1 text-xs hover:bg-stone-50 disabled:opacity-50"
        >
          Find meeting times
        </button>
        <a
          href="/autopilot"
          className="rounded-lg border px-2 py-1 text-xs text-[var(--accent)] hover:bg-stone-50"
        >
          Open Autopilot
        </a>
      </div>
      {!canMail && connected && (
        <a href="/api/auth/microsoft/connect?consent=mail" className="mt-1 block text-xs text-[var(--accent)]">
          Mail access required
        </a>
      )}
      {!canCalendar && connected && (
        <a href="/api/auth/microsoft/connect?consent=calendar" className="mt-1 block text-xs text-[var(--accent)]">
          Calendar access required
        </a>
      )}
      {msg && <p className="mt-2 text-xs text-stone-600">{msg}</p>}
      {slots.length > 0 && (
        <ul className="mt-1 space-y-1 text-xs">
          {slots.map((s) => (
            <li key={s.start}>
              <button
                type="button"
                disabled={loading || !canCalendar}
                className="text-left text-[var(--accent)] hover:underline disabled:opacity-50"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch("/api/automation/event-draft", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        constituentId: item.constituentId,
                        subject: `Tuesday: ${item.constituentName} — ${item.recommendedAction.replace(/_/g, " ")}`,
                        start: s.start,
                        end: s.end,
                        timezone: "America/New_York",
                        location: "Video call (TBD)",
                        attendees: [],
                        body: item.suggestedMessage || item.whyNow,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message ?? data.error ?? "Failed");
                    setMsg("Event draft created — review in Autopilot inbox.");
                  } catch (e) {
                    setMsg(e instanceof Error ? e.message : "Failed");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {new Date(s.start).toLocaleString()} – {new Date(s.end).toLocaleTimeString()} · Create event draft
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
