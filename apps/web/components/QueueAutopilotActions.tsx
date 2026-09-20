"use client";

import { useEffect, useState } from "react";
import type { QueueItem } from "@tuesday/core";
import { MicrosoftPermissionConnect } from "@/components/MicrosoftPermissionConnect";
import { useM365Session, type SharedM365Session } from "@/components/M365SessionContext";

type M365Session = {
  connected: boolean;
  mailAutopilotReady?: boolean;
  calendarReady?: boolean;
  outlookReady?: boolean;
  accountLinked?: boolean;
  canStartOAuth?: boolean;
  configurationError?: boolean;
  missingCalendarConsent?: boolean;
  missingMailConsent?: boolean;
  connectUrl?: string;
  message?: string;
};

export function QueueAutopilotActions({
  item,
  session: sessionProp,
}: {
  item: QueueItem;
  session?: SharedM365Session | null;
}) {
  const ctx = useM365Session();
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localM365, setLocalM365] = useState<M365Session | null>(null);
  const [slots, setSlots] = useState<Array<{ start: string; end: string }>>([]);

  const shared = sessionProp ?? ctx?.session ?? null;
  const m365 = (shared as M365Session | null) ?? localM365;

  useEffect(() => {
    if (shared) return;
    fetch("/api/auth/microsoft/session")
      .then((r) => r.json())
      .then(setLocalM365);
  }, [shared]);

  const mailReady = m365?.mailAutopilotReady === true;
  const calendarReady = m365?.calendarReady === true;
  const canMail = mailReady;
  const canCalendar = calendarReady;

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
        Outlook sign-in isn’t set up for this app yet.
      </div>
    );
  }

  if (m365?.accountLinked && !mailReady && !calendarReady) {
    return (
      <div className="mt-3 border-t pt-3">
        <p className="text-xs font-semibold uppercase text-[var(--muted)]">Autopilot</p>
        <p className="mt-1 text-xs text-amber-900">You’re signed in — connect mail or calendar to use these actions.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <MicrosoftPermissionConnect consent="mail" returnTo="/" label="Connect mail" className="!px-2 !py-1 !text-xs" />
          <MicrosoftPermissionConnect consent="calendar" returnTo="/" label="Connect calendar" className="!px-2 !py-1 !text-xs" />
        </div>
      </div>
    );
  }

  if (m365 && !m365.accountLinked) {
    return (
      <div className="mt-3 border-t pt-3">
        <p className="text-xs font-semibold uppercase text-[var(--muted)]">Autopilot</p>
        <p className="mt-1 text-xs text-amber-900">Connect Outlook to draft email or find meeting times.</p>
        <div className="mt-2">
          <MicrosoftPermissionConnect
            consent="full"
            returnTo="/"
            label="Connect Outlook"
            variant="primary"
            className="!px-3 !py-1 !text-xs"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">Autopilot · Outlook</p>
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
      {!canMail && m365?.accountLinked && (
        <a
          href="/api/auth/microsoft/connect?consent=mail&accountKind=personal&pickAccount=1&returnTo=%2Fautopilot"
          className="mt-1 block text-xs text-[var(--accent)]"
        >
          Connect mail to draft email
        </a>
      )}
      {!canCalendar && m365?.accountLinked && (
        <a href="/api/auth/microsoft/connect?consent=calendar" className="mt-1 block text-xs text-[var(--accent)]">
          Connect calendar for meeting times
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
