export function mondayOfWeek(reference: Date): Date {
  const out = new Date(reference);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
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
  const ref = weekStart ? new Date(`${weekStart}T12:00:00`) : new Date();
  return mondayOfWeek(ref);
}
