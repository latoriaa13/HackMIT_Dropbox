"use client";

import type { CalendarAwareSchedule, OutlookBusyBlock } from "@tuesday/core";
import { buildWeekGrid, dayTitle } from "@/lib/week-planner-grid";

const KIND_STYLES: Record<string, string> = {
  outlook_busy: "border-blue-300 bg-blue-100 text-blue-950",
  outlook_free: "border-blue-100 bg-blue-50/60 text-blue-900",
  fundraising: "border-orange-300 bg-orange-50 text-orange-950",
  available: "border-stone-200 bg-stone-50 text-stone-700",
};

export function WeekPlannerGrid({
  schedule,
  outlookEvents,
  weekStart,
  timezone,
}: {
  schedule?: CalendarAwareSchedule | null;
  outlookEvents?: OutlookBusyBlock[];
  weekStart: string;
  timezone?: string;
}) {
  const zone = schedule?.timezone ?? timezone;
  const byDay = buildWeekGrid({ schedule, outlookEvents, weekStart, timezone: zone });
  const days = Object.keys(byDay).sort();

  if (!days.length) {
    return <p className="text-sm text-[var(--muted)]">No planning week selected.</p>;
  }

  const hasOutlook = days.some((d) => byDay[d].some((b) => b.kind.startsWith("outlook")));
  const hasTasks = days.some((d) => byDay[d].some((b) => b.kind === "fundraising"));

  return (
    <div className="space-y-4">
      {zone && (
        <p className="text-xs text-[var(--muted)]">
          Times shown in your Outlook timezone ({zone.replace(/_/g, " ")}).
        </p>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="rounded border border-blue-300 bg-blue-100 px-2 py-1">Busy (Outlook)</span>
        <span className="rounded border border-orange-300 bg-orange-50 px-2 py-1">Proposed task</span>
        <span className="rounded border border-green-300 bg-green-50 px-2 py-1">Approved task</span>
        <span className="text-[var(--muted)]">Busy blocks are never overwritten — tasks slot into open time.</span>
      </div>

      {!hasOutlook && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          No Outlook events loaded for this week. Refresh calendar on the connection card, then Build schedule.
        </p>
      )}

      {hasOutlook && !hasTasks && (
        <p className="text-sm text-[var(--muted)]">
          Outlook meetings shown below. Click <strong>Build schedule</strong> to place fundraising tasks in open slots.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {days.map((day) => (
          <div key={day} className="rounded-xl border bg-white p-3">
            <h4 className="text-sm font-semibold">{dayTitle(day, zone)}</h4>
            <ul className="mt-2 space-y-2">
              {byDay[day].length === 0 && (
                <li className="text-xs text-[var(--muted)]">No events or tasks this day.</li>
              )}
              {byDay[day].map((block) => {
                let cls = KIND_STYLES[block.kind] ?? KIND_STYLES.available;
                if (block.kind === "fundraising" && block.status === "approved") {
                  cls = "border-green-400 bg-green-50 text-green-950";
                }
                if (block.conflict) cls = "border-red-400 bg-red-50 text-red-950";
                return (
                  <li key={block.id} className={`rounded-lg border px-2 py-2 text-xs ${cls}`}>
                    <p className="font-medium">{block.label}</p>
                    {block.detail && <p className="mt-1 opacity-90">{block.detail}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
