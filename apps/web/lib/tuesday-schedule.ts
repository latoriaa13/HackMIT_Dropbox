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
  getOutlookTimeZoneContext,
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
  const { iana: outlookIana } = await getOutlookTimeZoneContext(userId, timezone);
  const calendarWeek = await fetchAndCacheCalendarWeek(userId, provider, {
    weekStart,
    timezone: outlookIana,
  });
  const { events, syncedAt, weekStart: ws, weekEnd } = calendarWeek;
  const schedule = buildCalendarAwareSchedule({
    queueItems: queueResult.items,
    outlookEvents: calendarEventsToBusyBlocks(events),
    weekStart: ws,
    preferences: {
      ...DEFAULT_SCHEDULING_PREFERENCES,
      timezone: outlookIana,
      ...preferences,
    },
    generatedAt: new Date().toISOString(),
  });
  saveUserSchedule(userId, schedule);
  return {
    schedule,
    queueResult,
    calendarSync: {
      syncedAt,
      weekStart: ws,
      weekEnd,
      usedFallbackCache:
        "usedFallbackCache" in calendarWeek ? calendarWeek.usedFallbackCache : undefined,
    },
  };
}

export async function refreshCalendarAndSchedule(userId: string, options?: { weekStart?: string }) {
  assertCalendarAccess(userId);
  const existing = getUserSchedule(userId);
  const provider = requireMicrosoft365Provider(userId);
  const cached = getCachedCalendarWeek(userId);
  const weekStart = options?.weekStart ?? existing?.weekStart ?? cached?.weekStart;
  const { iana: outlookIana } = await getOutlookTimeZoneContext(userId, cached?.timezone);
  const { events, syncedAt, weekStart: ws, weekEnd, eventCount } = await fetchAndCacheCalendarWeek(
    userId,
    provider,
    {
      weekStart,
      timezone: outlookIana,
    }
  );
  if (!existing) {
    return {
      schedule: null,
      outlookEvents: calendarEventsToBusyBlocks(events),
      calendarSync: { syncedAt, weekStart: ws, weekEnd, eventCount },
    };
  }
  const refreshed = detectScheduleConflictsAfterRefresh(
    existing,
    calendarEventsToBusyBlocks(events)
  );
  saveUserSchedule(userId, refreshed);
  return {
    schedule: refreshed,
    outlookEvents: calendarEventsToBusyBlocks(events),
    calendarSync: { syncedAt, weekStart: ws, weekEnd, eventCount },
  };
}

export { getUserSchedule, rescheduleTaskInPlan, getCachedCalendarWeek };
