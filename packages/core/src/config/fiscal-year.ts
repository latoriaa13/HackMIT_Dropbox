export type FiscalConfig = {
  currentFiscalYear: number;
  fiscalYearStartMonth: number;
  referenceDate: string;
};

export const DEFAULT_FISCAL_CONFIG: FiscalConfig = {
  currentFiscalYear: Number(process.env.CURRENT_FISCAL_YEAR ?? 2026),
  fiscalYearStartMonth: 7,
  referenceDate: process.env.REFERENCE_DATE ?? "2026-09-01",
};

export function parseFiscalYear(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}
