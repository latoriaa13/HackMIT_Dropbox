"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BuildTuesdayInput,
  BuildTuesdayResult,
  Channel,
  FundraisingObjective,
  RiskPreference,
  WeeklyCalendar,
} from "@tuesday/core";
import { QueueCard } from "@/components/QueueCard";
import { WeeklyCalendarView } from "@/components/WeeklyCalendarView";
import { formatCurrency } from "@/lib/format";
import { applyFeedbackDeprioritize, feedbackCount } from "@/lib/feedback";

const OBJECTIVES: { value: FundraisingObjective; label: string }[] = [
  { value: "protect_renewals", label: "Protect renewals" },
  { value: "maximize_near_term_dollars", label: "Maximize near-term dollars" },
  { value: "grow_recurring", label: "Grow recurring giving" },
  { value: "reactivate_lapsed", label: "Reactivate lapsed donors" },
  { value: "fill_an_event", label: "Fill an event" },
];

const HOUR_OPTIONS = [4, 8, 16];

export default function WeeklyPlanPage() {
  const [objective, setObjective] = useState<FundraisingObjective>("protect_renewals");
  const [staffHours, setStaffHours] = useState(8);
  const [riskPreference, setRiskPreference] = useState<RiskPreference>("balanced");
  const [channels, setChannels] = useState<Channel[]>([
    "phone",
    "email",
    "event_invitation",
    "stewardship_message",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildTuesdayResult | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setMetaError(d.error);
        else setSchoolName(d.meta?.schoolName ?? "");
      })
      .catch(() => setMetaError("Could not reach API"));
  }, []);

  const build = useCallback(async () => {
    if (channels.length === 0) return;
    const payload: BuildTuesdayInput = {
      objective,
      staffHours,
      channels,
      riskPreference,
    };
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tuesday/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Build failed");
      setResult({
        ...data,
        items: applyFeedbackDeprioritize(data.items),
      });
      setFeedbackTotal(feedbackCount());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build failed");
    } finally {
      setLoading(false);
    }
  }, [objective, staffHours, channels, riskPreference]);

  const initialBuild = useRef(false);
  useEffect(() => {
    if (metaError || initialBuild.current) return;
    initialBuild.current = true;
    build();
  }, [metaError, build]);

  const toggleChannel = (ch: Channel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const exportCsv = async () => {
    const res = await fetch("/api/export/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objective,
        staffHours,
        channels,
        riskPreference,
      }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tuesday-queue.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Build my Tuesday</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          {schoolName
            ? `${schoolName} — `
            : ""}
          Builds a <strong>Mon–Fri calendar</strong> with timed steps—prep, outreach, and CRM
          wrap-up—spread across your weekly hour budget. Estimates are planning scenarios, not
          guaranteed revenue.
        </p>
        {metaError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {metaError}. From repo root run <code className="font-mono">npm run ingest</code>.
          </p>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-medium">Fundraising objective</legend>
            <div className="mt-2 space-y-2">
              {OBJECTIVES.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="objective"
                    checked={objective === o.value}
                    onChange={() => setObjective(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-4">
            <fieldset>
              <legend className="text-sm font-medium">Staff time this week</legend>
              <div className="mt-2 flex gap-2">
                {HOUR_OPTIONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setStaffHours(h)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      staffHours === h
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border)] bg-white"
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium">Risk preference</legend>
              <select
                className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                value={riskPreference}
                onChange={(e) => setRiskPreference(e.target.value as RiskPreference)}
              >
                <option value="revenue_focused">Revenue-focused</option>
                <option value="balanced">Balanced</option>
                <option value="relationship_focused">Relationship-focused</option>
              </select>
            </fieldset>
          </div>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Preferred channels</legend>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {(
              [
                ["phone", "Phone"],
                ["email", "Email"],
                ["event_invitation", "Event invitation"],
                ["stewardship_message", "Stewardship message"],
              ] as const
            ).map(([ch, label]) => (
              <label key={ch} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={channels.includes(ch)}
                  onChange={() => toggleChannel(ch)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={build}
            disabled={loading || channels.length === 0}
            className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow disabled:opacity-50"
          >
            {loading ? "Building…" : "Build my Tuesday"}
          </button>
          {result && (
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl border border-[var(--border)] bg-white px-6 py-3 text-sm font-medium"
            >
              Export calendar CSV
            </button>
          )}
          {result && (
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              className="rounded-xl border border-[var(--border)] bg-white px-6 py-3 text-sm font-medium"
            >
              {showList ? "Hide list view" : "Show list view"}
            </button>
          )}
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">{error}</p>
      )}

      {result && (
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              label="Conservative opportunity"
              value={formatCurrency(result.totals.conservative)}
            />
            <Stat label="Expected opportunity" value={formatCurrency(result.totals.expected)} />
            <Stat label="Upside opportunity" value={formatCurrency(result.totals.upside)} />
          </div>
          <p className="text-sm text-[var(--muted)]">
            {result.items.length} actions · {result.minutesUsed} / {result.minutesBudget} minutes
            · {result.candidateCount} candidates scored
            {feedbackTotal > 0 && ` · ${feedbackTotal} feedback note(s) in this browser`}
          </p>
          {result.calendar?.days?.length ? (
            <WeeklyCalendarView calendar={result.calendar as WeeklyCalendar} />
          ) : (
            <p className="text-sm text-[var(--muted)]">No calendar steps generated.</p>
          )}
          {showList && (
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Priority list (same actions)
              </h2>
              {result.items.map((item, i) => (
                <QueueCard key={item.constituentId} item={item} rank={i + 1} />
              ))}
            </div>
          )}
          {result.items.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No actions fit this budget and channel mix. Try more hours or additional channels.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
