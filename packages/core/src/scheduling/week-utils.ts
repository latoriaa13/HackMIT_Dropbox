export function mondayOfWeek(reference: Date): Date {
  const out = new Date(reference);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Mon–Fri planning week: on Sat/Sun use the upcoming Monday (next week), else this week's Monday. */
export function defaultPlanningWeekStartIso(reference: Date = new Date()): string {
  const day = reference.getDay();
  const out = new Date(reference);
  out.setHours(12, 0, 0, 0);
  if (day === 6) {
    out.setDate(out.getDate() + 2);
    return isoDate(out);
  }
  if (day === 0) {
    out.setDate(out.getDate() + 1);
    return isoDate(out);
  }
  return isoDate(mondayOfWeek(out));
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function weekRangeFromStart(weekStart: Date, workDays: number): { weekStart: string; weekEnd: string } {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + workDays - 1);
  return { weekStart: isoDate(weekStart), weekEnd: isoDate(end) };
}

export function parseWeekStart(weekStart?: string): Date {
  if (weekStart) return mondayOfWeek(new Date(`${weekStart}T12:00:00`));
  return new Date(`${defaultPlanningWeekStartIso()}T12:00:00`);
}
