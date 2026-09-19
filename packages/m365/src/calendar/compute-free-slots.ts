import type { CalendarEvent, FindFreeSlotsInput, FreeSlot } from "../schemas/m365-schemas";

function overlaps(slotStart: number, slotEnd: number, evStart: number, evEnd: number) {
  return slotStart < evEnd && slotEnd > evStart;
}

/** Propose free slots within working hours, excluding busy calendar events. */
export function computeFreeSlots(input: FindFreeSlotsInput, busyEvents: CalendarEvent[]): FreeSlot[] {
  const slots: FreeSlot[] = [];
  const rangeStart = new Date(input.start).getTime();
  const rangeEnd = new Date(input.end).getTime();
  const durationMs = input.durationMinutes * 60_000;
  const busy = busyEvents.map((ev) => ({
    start: new Date(ev.start).getTime(),
    end: new Date(ev.end).getTime(),
  }));

  for (let t = rangeStart; t < rangeEnd && slots.length < 12; t += 24 * 60 * 60 * 1000) {
    const day = new Date(t);
    for (let hour = input.workingHoursStart; hour < input.workingHoursEnd; hour++) {
      for (const minute of [0, 30]) {
        const s = new Date(day);
        s.setHours(hour, minute, 0, 0);
        const startMs = s.getTime();
        const endMs = startMs + durationMs;
        if (startMs < rangeStart || endMs > rangeEnd) continue;
        if (s.getHours() >= input.workingHoursEnd) continue;
        const conflict = busy.some((b) => overlaps(startMs, endMs, b.start, b.end));
        if (conflict) continue;
        slots.push({
          start: new Date(startMs).toISOString(),
          end: new Date(endMs).toISOString(),
          timezone: input.timezone,
        });
      }
    }
  }
  return slots;
}
