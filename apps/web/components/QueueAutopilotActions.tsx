"use client";

import { useState } from "react";
import type { QueueItem } from "@tuesday/core";

export function QueueAutopilotActions({ item }: { item: QueueItem }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ draftId: string; approvalToken: string } | null>(null);
  const [slots, setSlots] = useState<Array<{ start: string; end: string }>>([]);

  const draftEmail = async () => {
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
      if (!res.ok) throw new Error(data.error ?? data.reasons?.join(", "));
      setDraft({ draftId: data.draft.draftId, approvalToken: data.draft.approvalToken });
      setMsg(`Draft ready (${data.draft.mode} mode) — approve in Autopilot inbox.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const findTime = async () => {
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
      if (!res.ok) throw new Error(data.error);
      setSlots(data.slots?.slice(0, 5) ?? []);
      setMsg("Proposed slots (mock or your calendar). Select one in Autopilot to draft an event.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">Autopilot</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={draftEmail}
          className="rounded-lg border px-2 py-1 text-xs hover:bg-stone-50 disabled:opacity-50"
        >
          Draft follow-up email
        </button>
        <button
          type="button"
          disabled={loading}
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
      {msg && <p className="mt-2 text-xs text-stone-600">{msg}</p>}
      {draft && (
        <p className="mt-1 text-xs text-[var(--muted)]">
          Pending draft {draft.draftId.slice(0, 8)}…
        </p>
      )}
      {slots.length > 0 && (
        <ul className="mt-1 space-y-1 text-xs">
          {slots.map((s) => (
            <li key={s.start}>
              <button
                type="button"
                disabled={loading}
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
                    if (!res.ok) throw new Error(data.error ?? "Failed");
                    setMsg(`Event draft created (${data.draft.mode}) — review in Autopilot inbox.`);
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
