import type { BuildTuesdayInput, BuildTuesdayResult, ProcessedDataset } from "./models/types";
import { DEFAULT_FISCAL_CONFIG } from "./config/fiscal-year";
import { buildPortfolioFromProfiles } from "./optimize/weekly-queue";
import { queueTotals } from "./optimize/weekly-queue";
import { buildWeeklyCalendar } from "./schedule/weekly-calendar";

export function buildTuesday(
  dataset: ProcessedDataset,
  input: BuildTuesdayInput
): BuildTuesdayResult {
  const built = buildPortfolioFromProfiles(dataset.profiles, input);
  const totals = queueTotals(built.items);

  const calendar = buildWeeklyCalendar(built.items, input.staffHours);

  return {
    items: built.items,
    calendar,
    totals,
    minutesUsed: built.minutesUsed,
    minutesBudget: input.staffHours * 60,
    candidateCount: built.candidateCount,
    config: {
      objective: input.objective,
      staffHours: input.staffHours,
      channels: input.channels,
      riskPreference: input.riskPreference,
      currentFiscalYear: DEFAULT_FISCAL_CONFIG.currentFiscalYear,
    },
  };
}
