"use client";

import { useState } from "react";
import type { CalendarAwareSchedule, SchedulableFundraisingTask } from "@tuesday/core";
import { formatHour12, formatTimeRangeInZone } from "@tuesday/core";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WeekPlannerGrid } from "@/components/WeekPlannerGrid";

type ViewMode = "queue" | "schedule" | "split";

function formatRange(start: string, end: string, timezone: string) {
  return formatTimeRangeInZone(start, end, timezone);
}

function taskRowClass(task: SchedulableFundraisingTask) {
  if (task.hasCalendarConflict) return "border-red-300 bg-red-50";
  if (task.schedulingStatus === "approved") return "border-green-300 bg-green-50";
  if (task.schedulingStatus === "completed") return "border-stone-200 bg-stone-50 opacity-80";
  if (task.schedulingStatus === "denied") return "border-stone-200 bg-stone-50 opacity-60";
  return "border-orange-200 bg-orange-50";
}

export function CalendarAwareScheduleView({
  schedule,
  queueItems,
  viewMode,
  onViewModeChange,
  onScheduleUpdated,
  staffHours,
}: {
  schedule: CalendarAwareSchedule;
  queueItems: Array<{ constituentId: string; constituentName: string; recommendedAction: string; whyNow: string }>;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  onScheduleUpdated: (s: CalendarAwareSchedule) => void;
  staffHours: number;
}) {
  const router = useRouter();
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [altTaskId, setAltTaskId] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<Array<{ start: string; end: string }>>([]);

  const goAutopilotPending = () => router.push("/autopilot?tab=pending");

  const act = async (path: string, method = "POST", body?: unknown) => {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? data.error ?? "Request failed");
    if (data.schedule) onScheduleUpdated(data.schedule);
    return data;
  };

  const loadAlternatives = async (taskId: string) => {
    setBusyTaskId(taskId);
    setAltTaskId(taskId);
    try {
      const data = await fetch(`/api/tuesday/schedule/${taskId}/reschedule`).then((r) => r.json());
      setAlternatives(data.alternatives ?? []);
    } finally {
      setBusyTaskId(null);
    }
  };

  const proposed = schedule.tasks.filter((t) => t.schedulingStatus === "proposed");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-4 text-sm">
        <p className="font-medium">Weekly plan · {schedule.weekStart} – {schedule.weekEnd}</p>
        <p className="mt-1 text-[var(--muted)]">
          {staffHours}h fundraising budget · {schedule.preferences.workDays}-day week,{" "}
          {formatHour12(schedule.preferences.workingHoursStart)}–
          {formatHour12(schedule.preferences.workingHoursEnd)} (
          {schedule.preferences.workDays *
            (schedule.preferences.workingHoursEnd - schedule.preferences.workingHoursStart)}
          h capacity before Outlook). Outlook shows {schedule.summary.outlookMeetingCount} meetings and{" "}
          {Math.round(schedule.summary.totalAvailableWorkMinutes / 60)}h open for tasks. DonoRex found{" "}
          {schedule.summary.tasksProposed} recommended actions.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <li>{schedule.summary.tasksProposed} tasks proposed</li>
          <li>
            {Math.floor(schedule.summary.scheduledMinutes / 60)}h {schedule.summary.scheduledMinutes % 60}m scheduled
          </li>
          <li>{Math.round(schedule.summary.availableFundraisingMinutes / 60)}h remaining capacity</li>
          <li>{formatCurrency(schedule.summary.expectedOpportunity)} expected opportunity</li>
          <li>{schedule.summary.tasksUnscheduled} could not fit</li>
          <li>{schedule.summary.conflictCount} conflicts</li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["queue", "schedule", "split"] as ViewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onViewModeChange(m)}
            className={`rounded-lg px-3 py-1 text-sm capitalize ${
              viewMode === m ? "bg-[var(--accent)] text-white" : "border bg-white"
            }`}
          >
            {m === "split" ? "Split view" : `${m} view`}
          </button>
        ))}
        <button
          type="button"
          className="rounded-lg border bg-white px-3 py-1 text-sm"
          disabled={!proposed.length}
          onClick={async () => {
            await act("/api/tuesday/schedule/approve-all");
            goAutopilotPending();
          }}
        >
          Approve all non-conflicting
        </button>
      </div>

      {(viewMode === "schedule" || viewMode === "split") && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase text-[var(--muted)]">
            Your week — Outlook busy time + proposed tasks
          </h3>
          <WeekPlannerGrid schedule={schedule} weekStart={schedule.weekStart} />
        </section>
      )}

      {(viewMode === "queue" || viewMode === "split") && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase text-[var(--muted)]">Fundraising tasks</h3>
          {schedule.tasks
            .filter((t) => t.schedulingStatus !== "completed")
            .map((task) => (
            <div key={task.id} className={`rounded-lg border p-4 text-sm ${taskRowClass(task)}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {task.suggestedStart && task.suggestedEnd
                      ? `${formatRange(task.suggestedStart, task.suggestedEnd, schedule.timezone)} · `
                      : "Unscheduled · "}
                    {task.title}
                  </p>
                  <p className="mt-1 text-[var(--muted)]">{task.whyNow}</p>
                  {task.whyThisTime && <p className="mt-1 text-xs">Why this time: {task.whyThisTime}</p>}
                  <p className="mt-1 text-xs">
                    {task.estimatedMinutes} min · {formatCurrency(task.expectedOpportunity)} expected · confidence{" "}
                    {Math.round(task.confidence * 100)}%
                    {task.hasCalendarConflict && " · conflicts with Outlook"}
                  </p>
                  <Link href={`/constituents/${task.constituentId}`} className="mt-1 inline-block text-xs text-[var(--accent)]">
                    View constituent
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {task.schedulingStatus === "proposed" && (
                    <>
                      <button
                        type="button"
                        disabled={busyTaskId === task.id}
                        className="rounded border bg-white px-2 py-1 text-xs"
                        onClick={() => loadAlternatives(task.id)}
                      >
                        Change time
                      </button>
                      <button
                        type="button"
                        className="rounded bg-green-700 px-2 py-1 text-xs text-white"
                        onClick={async () => {
                          await act(`/api/tuesday/schedule/${task.id}/approve`);
                          goAutopilotPending();
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => act(`/api/tuesday/schedule/${task.id}/deny`)}
                      >
                        Deny
                      </button>
                    </>
                  )}
                  {task.schedulingStatus === "approved" && (
                    <>
                      <span className="text-xs font-medium text-green-800">Awaiting Autopilot</span>
                      <button
                        type="button"
                        className="rounded border bg-white px-2 py-1 text-xs"
                        onClick={goAutopilotPending}
                      >
                        Open Autopilot
                      </button>
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => act(`/api/tuesday/schedule/${task.id}/complete`)}
                      >
                        Mark done
                      </button>
                    </>
                  )}
                </div>
              </div>
              {altTaskId === task.id && alternatives.length > 0 && (
                <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
                  <li className="font-medium text-[var(--muted)]">Suggested alternatives</li>
                  {alternatives.map((slot) => (
                    <li key={slot.start}>
                      <button
                        type="button"
                        className="text-[var(--accent)] hover:underline"
                        onClick={() =>
                          act(`/api/tuesday/schedule/${task.id}/reschedule`, "POST", {
                            start: slot.start,
                            end: slot.end,
                          }).then(() => {
                            setAltTaskId(null);
                            setAlternatives([]);
                          })
                        }
                      >
                        Use {formatRange(slot.start, slot.end, schedule.timezone)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {viewMode === "queue" && queueItems.length > 0 && (
            <p className="text-xs text-[var(--muted)]">
              Queue also includes {queueItems.length} prioritized actions from the fundraising engine.
            </p>
          )}
          {schedule.tasks.some((t) => t.schedulingStatus === "completed") && (
            <div className="mt-6 border-t pt-4">
              <h4 className="text-xs font-semibold uppercase text-[var(--muted)]">Completed</h4>
              <ul className="mt-2 space-y-1 text-xs text-[var(--muted)]">
                {schedule.tasks
                  .filter((t) => t.schedulingStatus === "completed")
                  .map((t) => (
                    <li key={t.id}>✓ {t.title}</li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
