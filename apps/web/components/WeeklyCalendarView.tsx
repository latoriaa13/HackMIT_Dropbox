import Link from "next/link";
import type { WeeklyCalendar } from "@tuesday/core";
import { formatAction, formatCurrency } from "@/lib/format";

export function WeeklyCalendarView({ calendar }: { calendar: WeeklyCalendar }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">
        Week of {calendar.weekStart} – {calendar.weekEnd} · ~{calendar.minutesPerDay} min outreach
        budget per day (Mon–Fri) · {calendar.bufferMinutes} min buffer between steps
      </p>

      <div className="grid gap-6 lg:grid-cols-1">
        {calendar.days.map((day) => (
          <section
            key={day.date}
            className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          >
            <header className="border-b border-[var(--border)] bg-stone-50 px-4 py-3">
              <h2 className="font-semibold">{day.dayLabel}</h2>
              <p className="text-xs text-[var(--muted)]">
                {day.totalMinutes} scheduled minutes · {day.steps.length} steps
              </p>
            </header>
            <ol className="divide-y divide-stone-100">
              {day.steps.map((step) => (
                <li key={step.stepIndex} className="flex gap-4 px-4 py-3 text-sm">
                  <div className="w-28 shrink-0 font-mono text-xs text-[var(--muted)]">
                    {step.startTime}
                    <br />
                    {step.endTime}
                  </div>
                  <div className="min-w-0 flex-1">
                    {step.kind === "constituent_action" && step.constituentId ? (
                      <>
                        <Link
                          href={`/constituents/${step.constituentId}`}
                          className="font-semibold text-[var(--accent)] hover:underline"
                        >
                          {step.title}
                        </Link>
                        <p className="mt-0.5">
                          {step.action ? formatAction(step.action) : step.detail} ·{" "}
                          {step.durationMinutes} min
                        </p>
                        {step.expectedOpportunity !== undefined && (
                          <p className="text-xs text-[var(--muted)]">
                            Planning opp. {formatCurrency(step.expectedOpportunity)}
                          </p>
                        )}
                        {step.whyNow && (
                          <p className="mt-1 text-xs text-stone-600">Why now: {step.whyNow}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-stone-700">{step.title}</p>
                        <p className="text-[var(--muted)]">{step.detail}</p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
