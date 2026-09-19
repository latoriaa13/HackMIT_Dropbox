"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BuildTuesdayInput,
  BuildTuesdayResult,
  CalendarAwareSchedule,
  Channel,
  FundraisingObjective,
  RiskPreference,
} from "@tuesday/core";
import { QueueCard } from "@/components/QueueCard";
import { OutlookConnectionCard } from "@/components/OutlookConnectionCard";
import { CalendarAwareScheduleView } from "@/components/CalendarAwareScheduleView";
import { formatCurrency } from "@/lib/format";
import { applyFeedbackDeprioritize, feedbackCount } from "@/lib/feedback";
import { formatM365UserError } from "@/lib/m365-user-errors";
import { MicrosoftPermissionConnect } from "@/components/MicrosoftPermissionConnect";

const OBJECTIVES: { value: FundraisingObjective; label: string }[] = [
  { value: "protect_renewals", label: "Protect renewals" },
  { value: "maximize_near_term_dollars", label: "Maximize near-term dollars" },
  { value: "grow_recurring", label: "Grow recurring giving" },
  { value: "reactivate_lapsed", label: "Reactivate lapsed donors" },
  { value: "fill_an_event", label: "Fill an event" },
];

const HOUR_OPTIONS = [4, 8, 16];

function mondayIso(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(m.getDate() + diff);
  return m.toISOString().slice(0, 10);
}

type ViewMode = "queue" | "schedule" | "split";

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
  const [weekStart, setWeekStart] = useState(mondayIso());
  const [workingHoursStart, setWorkingHoursStart] = useState(9);
  const [workingHoursEnd, setWorkingHoursEnd] = useState(17);
  const [lunchStartHour, setLunchStartHour] = useState(12);
  const [lunchEndHour, setLunchEndHour] = useState(13);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ReturnType<typeof formatM365UserError> | null>(null);
  const [result, setResult] = useState<BuildTuesdayResult | null>(null);
  const [schedule, setSchedule] = useState<CalendarAwareSchedule | null>(null);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [metaError, setMetaError] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");
  const [feedbackTotal, setFeedbackTotal] = useState(0);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setMetaError(d.error);
        else setSchoolName(d.meta?.schoolName ?? "");
      })
      .catch(() => setMetaError("Could not reach API"));
  }, []);

  const buildPayload = useCallback(
    (): BuildTuesdayInput => ({
      objective,
      staffHours,
      channels,
      riskPreference,
    }),
    [objective, staffHours, channels, riskPreference]
  );

  const build = useCallback(async () => {
    if (channels.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      if (outlookConnected) {
        const res = await fetch("/api/tuesday/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...buildPayload(),
            weekStart,
            preferences: {
              workingHoursStart,
              workingHoursEnd,
              lunchStartHour,
              lunchEndHour,
              bufferBetweenTasksMinutes: bufferMinutes,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(formatM365UserError(data));
          return;
        }
        setSchedule(data.schedule);
        setResult({
          ...data.queueResult,
          items: applyFeedbackDeprioritize(data.queueResult.items),
        });
      } else {
        const res = await fetch("/api/tuesday/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Build failed");
        setSchedule(null);
        setResult({
          ...data,
          items: applyFeedbackDeprioritize(data.items),
        });
      }
      setFeedbackTotal(feedbackCount());
    } catch (e) {
      setError({ title: "Build failed", detail: e instanceof Error ? e.message : "Build failed" });
    } finally {
      setLoading(false);
    }
  }, [
    channels,
    outlookConnected,
    buildPayload,
    weekStart,
    workingHoursStart,
    workingHoursEnd,
    lunchStartHour,
    lunchEndHour,
    bufferMinutes,
  ]);

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
      body: JSON.stringify(buildPayload()),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tuesday-queue.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSchedule = () => {
    if (!schedule) return;
    const blob = new Blob([JSON.stringify(schedule, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tuesday-schedule-${schedule.weekStart}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <OutlookConnectionCard onConnectionChange={setOutlookConnected} />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Build my Tuesday</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          {schoolName ? `${schoolName} — ` : ""}
          Prioritize fundraising work against your real Outlook availability when connected. Planning
          stays local until you approve tasks; Outlook changes only after Autopilot confirmation.
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            Planning week (Monday)
            <input
              type="date"
              className="mt-1 w-full rounded-lg border px-2 py-1"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Work day start (hour)
            <input
              type="number"
              min={6}
              max={12}
              className="mt-1 w-full rounded-lg border px-2 py-1"
              value={workingHoursStart}
              onChange={(e) => setWorkingHoursStart(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            Work day end (hour)
            <input
              type="number"
              min={13}
              max={21}
              className="mt-1 w-full rounded-lg border px-2 py-1"
              value={workingHoursEnd}
              onChange={(e) => setWorkingHoursEnd(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            Buffer between tasks (min)
            <input
              type="number"
              min={0}
              max={60}
              className="mt-1 w-full rounded-lg border px-2 py-1"
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            Lunch start (hour)
            <input
              type="number"
              min={11}
              max={14}
              className="mt-1 w-full rounded-lg border px-2 py-1"
              value={lunchStartHour}
              onChange={(e) => setLunchStartHour(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            Lunch end (hour)
            <input
              type="number"
              min={12}
              max={15}
              className="mt-1 w-full rounded-lg border px-2 py-1"
              value={lunchEndHour}
              onChange={(e) => setLunchEndHour(Number(e.target.value))}
            />
          </label>
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
            {loading ? "Building…" : outlookConnected ? "Build schedule" : "Build my Tuesday"}
          </button>
          {result && (
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl border border-[var(--border)] bg-white px-6 py-3 text-sm font-medium"
            >
              Export queue CSV
            </button>
          )}
          {schedule && (
            <button
              type="button"
              onClick={exportSchedule}
              className="rounded-xl border border-[var(--border)] bg-white px-6 py-3 text-sm font-medium"
            >
              Export schedule
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-medium">{error.title}</p>
          <p className="mt-1">{error.detail}</p>
          {error.action && (
            <MicrosoftPermissionConnect
              consent={error.action.consent}
              returnTo={error.action.returnTo ?? "/"}
              label={error.action.label}
              variant="primary"
              className="mt-3"
            />
          )}
        </div>
      )}

      {result && (
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Conservative opportunity" value={formatCurrency(result.totals.conservative)} />
            <Stat label="Expected opportunity" value={formatCurrency(result.totals.expected)} />
            <Stat label="Upside opportunity" value={formatCurrency(result.totals.upside)} />
          </div>
          <p className="text-sm text-[var(--muted)]">
            {result.items.length} actions · {result.minutesUsed} / {result.minutesBudget} minutes ·{" "}
            {result.candidateCount} candidates scored
            {feedbackTotal > 0 && ` · ${feedbackTotal} feedback note(s) in this browser`}
          </p>

          {schedule && outlookConnected ? (
            <CalendarAwareScheduleView
              schedule={schedule}
              queueItems={result.items}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onScheduleUpdated={setSchedule}
              staffHours={staffHours}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-6 text-sm text-amber-950">
              Connect Outlook and click <strong>Build schedule</strong> to place recommended actions
              around your live calendar. Queue priorities below still reflect the fundraising engine.
            </div>
          )}

          {(!schedule || viewMode === "queue") && (
            <div className="space-y-4 border-t pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Priority queue
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
