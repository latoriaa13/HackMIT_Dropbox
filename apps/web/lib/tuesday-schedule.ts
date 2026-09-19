import {
  buildTuesday,
  buildCalendarAwareSchedule,
  BuildTuesdayInputSchema,
  DEFAULT_SCHEDULING_PREFERENCES,
  rescheduleTaskInPlan,
  type BuildTuesdayInput,
} from "@tuesday/core";
import {
  calendarEventsToBusyBlocks,
  detectScheduleConflictsAfterRefresh,
  fetchAndCacheCalendarWeek,
  getCachedCalendarWeek,
  getUserSchedule,
  saveUserSchedule,
  requireMicrosoft365Provider,
  assertCalendarAccess,
} from "@tuesday/m365";
import { loadDataset } from "@/lib/data-store";
import { z } from "zod";

export const ScheduleBuildBodySchema = BuildTuesdayInputSchema.extend({
  weekStart: z.string().optional(),
  timezone: z.string().optional(),
  preferences: z
    .object({
      workingHoursStart: z.number().optional(),
      workingHoursEnd: z.number().optional(),
      lunchStartHour: z.number().optional(),
      lunchEndHour: z.number().optional(),
      bufferBetweenTasksMinutes: z.number().optional(),
      gapAfterIntensiveCallMinutes: z.number().optional(),
      reserveBufferMinutes: z.number().optional(),
    })
    .optional(),
});

export { assertCalendarAccess };

export async function buildAndStoreSchedule(userId: string, body: z.infer<typeof ScheduleBuildBodySchema>) {
  assertCalendarAccess(userId);
  const { weekStart, timezone, preferences, ...buildInput } = body;
  const dataset = loadDataset();
  const queueResult = buildTuesday(dataset, buildInput as BuildTuesdayInput);
  const provider = requireMicrosoft365Provider(userId);
  const { events, syncedAt, weekStart: ws, weekEnd } = await fetchAndCacheCalendarWeek(userId, provider, {
    weekStart,
    timezone: timezone ?? DEFAULT_SCHEDULING_PREFERENCES.timezone,
  });
  const schedule = buildCalendarAwareSchedule({
    queueItems: queueResult.items,
    outlookEvents: calendarEventsToBusyBlocks(events),
    weekStart: ws,
    preferences: {
      ...DEFAULT_SCHEDULING_PREFERENCES,
      timezone: timezone ?? DEFAULT_SCHEDULING_PREFERENCES.timezone,
      ...preferences,
    },
    generatedAt: new Date().toISOString(),
  });
  saveUserSchedule(userId, schedule);
  return { schedule, queueResult, calendarSync: { syncedAt, weekStart: ws, weekEnd } };
}

export async function refreshCalendarAndSchedule(userId: string) {
  assertCalendarAccess(userId);
  const existing = getUserSchedule(userId);
  const provider = requireMicrosoft365Provider(userId);
  const cached = getCachedCalendarWeek(userId);
  const weekStart = cached?.weekStart ?? existing?.weekStart;
  const { events, syncedAt } = await fetchAndCacheCalendarWeek(userId, provider, {
    weekStart,
    timezone: cached?.timezone ?? DEFAULT_SCHEDULING_PREFERENCES.timezone,
  });
  if (!existing) {
    return { schedule: null, calendarSync: { syncedAt } };
  }
  const refreshed = detectScheduleConflictsAfterRefresh(
    existing,
    calendarEventsToBusyBlocks(events)
  );
  saveUserSchedule(userId, refreshed);
  return { schedule: refreshed, calendarSync: { syncedAt } };
}

export { getUserSchedule, rescheduleTaskInPlan, getCachedCalendarWeek };
