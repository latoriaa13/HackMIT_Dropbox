import type { FiscalConfig } from "../config/fiscal-year";
import type {
  ConstituentProfile,
  GiftSummary,
  ProcessedDataset,
  TimelineEvent,
} from "../models/types";
import { deriveLabels } from "../labels/derive-labels";
import { computeScores, computeConfidence } from "../scores/compute-scores";
import { parseFiscalYear } from "../config/fiscal-year";

type RawTables = {
  schoolName: string;
  fiscalYearStartMonth: number;
  constituents: Record<string, string>[];
  gifts: Record<string, string>[];
  degrees: Record<string, string>[];
  affiliations: Record<string, string>[];
  activities: Record<string, string>[];
  events: Record<string, string>[];
  eventAttendance: Record<string, string>[];
  interactions: Record<string, string>[];
  careerHistory: Record<string, string>[];
  campaigns: Record<string, string>[];
};

function bool(v: string | undefined): boolean {
  return (v ?? "").toLowerCase() === "true";
}

function num(v: string | undefined): number | null {
  if (!v?.trim()) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export function buildProfilesFromRaw(
  raw: RawTables,
  config: FiscalConfig
): ProcessedDataset {
  const eventById = new Map(raw.events.map((e) => [e.id, e]));
  const giftsByConstituent = new Map<string, GiftSummary[]>();

  for (const g of raw.gifts) {
    if (g.status !== "paid") continue;
    const list = giftsByConstituent.get(g.constituent_id) ?? [];
    list.push({
      id: g.id,
      giftDate: g.gift_date,
      amount: num(g.amount) ?? 0,
      fiscalYear: parseFiscalYear(g.fiscal_year) ?? 0,
      giftType: g.gift_type ?? "one_time",
      status: g.status,
      campaignId: g.campaign_id || null,
      anonymous: bool(g.anonymous),
    });
    giftsByConstituent.set(g.constituent_id, list);
  }

  for (const [, list] of giftsByConstituent) {
    list.sort((a, b) => a.giftDate.localeCompare(b.giftDate));
  }

  const degreesByC = new Map<string, Record<string, string>[]>();
  for (const d of raw.degrees) {
    const list = degreesByC.get(d.constituent_id) ?? [];
    list.push(d);
    degreesByC.set(d.constituent_id, list);
  }

  const affByC = new Map<string, string[]>();
  for (const a of raw.affiliations) {
    const list = affByC.get(a.constituent_id) ?? [];
    if (a.affiliation_type) list.push(a.affiliation_type);
    affByC.set(a.constituent_id, list);
  }

  const actByC = new Map<string, string[]>();
  for (const a of raw.activities) {
    const list = actByC.get(a.constituent_id) ?? [];
    if (a.activity_name) list.push(a.activity_name);
    actByC.set(a.constituent_id, list);
  }

  const eventsByC = new Map<string, ConstituentProfile["events"]>();
  for (const ea of raw.eventAttendance) {
    const ev = eventById.get(ea.event_id);
    if (!ev) continue;
    const list = eventsByC.get(ea.constituent_id) ?? [];
    list.push({
      eventId: ea.event_id,
      eventName: ev.name,
      attendedAt: ea.attended_at,
      startsAt: ev.starts_at,
      city: ev.city || null,
    });
    eventsByC.set(ea.constituent_id, list);
  }

  const interactionsByC = new Map<string, Record<string, string>[]>();
  for (const i of raw.interactions) {
    const list = interactionsByC.get(i.constituent_id) ?? [];
    list.push(i);
    interactionsByC.set(i.constituent_id, list);
  }

  const careerByC = new Map<string, Record<string, string>[]>();
  for (const c of raw.careerHistory) {
    const list = careerByC.get(c.constituent_id) ?? [];
    list.push(c);
    careerByC.set(c.constituent_id, list);
  }

  const refDate = config.referenceDate;
  const profiles: ConstituentProfile[] = [];

  for (const c of raw.constituents) {
    const gifts = giftsByConstituent.get(c.id) ?? [];
    const paidGiftCount = gifts.length;
    const lifetimeGiving = gifts.reduce((s, g) => s + g.amount, 0);
    const averageGift = paidGiftCount ? lifetimeGiving / paidGiftCount : 0;
    const largestGift = gifts.reduce((m, g) => Math.max(m, g.amount), 0);
    const mostRecent = gifts[gifts.length - 1];
    const fiscalYears = [...new Set(gifts.map((g) => g.fiscalYear).filter(Boolean))].sort(
      (a, b) => a - b
    );
    const givingYearCount = fiscalYears.length;
    const consecutiveGivingYears = countConsecutiveYears(fiscalYears, config.currentFiscalYear);
    const currentFiscalYearGiving = gifts
      .filter((g) => g.fiscalYear === config.currentFiscalYear)
      .reduce((s, g) => s + g.amount, 0);
    const gaveCurrentYear = currentFiscalYearGiving > 0;
    const gavePriorYear = fiscalYears.includes(config.currentFiscalYear - 1);
    const yearsSinceLastGift = mostRecent
      ? Math.floor(daysBetween(mostRecent.giftDate, refDate) / 365)
      : null;

    const amountTrend = computeAmountTrend(gifts);
    const degreeRows = degreesByC.get(c.id) ?? [];
    const classYear =
      num(degreeRows.find((d) => d.class_year)?.class_year ?? "") ??
      num(degreeRows[0]?.class_year ?? "");

    const emailStatus = c.email_status ?? "missing";
    const phoneStatus = c.phone_status ?? "missing";
    const canEmail =
      emailStatus === "deliverable" && !!(c.primary_email ?? "").trim();
    const canPhone = phoneStatus === "available";

    const dataQualityFlags: string[] = [];
    if (!canEmail) dataQualityFlags.push("email_not_contactable");
    if (!canPhone) dataQualityFlags.push("phone_not_contactable");
    if (!classYear) dataQualityFlags.push("missing_class_year");
    if (bool(c.do_not_solicit)) dataQualityFlags.push("do_not_solicit");
    if (bool(c.deceased)) dataQualityFlags.push("deceased");

    const interactions = (interactionsByC.get(c.id) ?? []).sort((a, b) =>
      a.occurred_at.localeCompare(b.occurred_at)
    );
    const lastInteraction = interactions[interactions.length - 1];
    const daysSinceLastInteraction = lastInteraction
      ? daysBetween(lastInteraction.occurred_at, refDate)
      : null;

    const askAmounts = interactions
      .map((i) => num(i.ask_amount))
      .filter((x): x is number => x !== null && x > 0);
    const staleAskAmount = detectStaleAsk(askAmounts, mostRecent?.amount ?? null);

    const careers = careerByC.get(c.id) ?? [];
    const recentCareerUpdate = careers.some((cr) => {
      if (!cr.recorded_at) return false;
      return daysBetween(cr.recorded_at, refDate) <= 180;
    });

    const hasRecurringGift = gifts.some((g) => g.giftType === "recurring_parent");
    const events = eventsByC.get(c.id) ?? [];

    const partial = {
      paidGiftCount,
      givingYearCount,
      gaveCurrentYear,
      gavePriorYear,
      yearsSinceLastGift,
      lifetimeGiving,
      hasRecurringGift,
      averageGift,
      amountTrend,
      eventCount: events.length,
      dataQualityFlags,
      canEmail,
      canPhone,
      deceased: bool(c.deceased),
      doNotSolicit: bool(c.do_not_solicit),
    };

    const labels = deriveLabels(partial, fiscalYears, config);
    const base: ConstituentProfile = {
      id: c.id,
      displayName: c.preferred_name || `${c.first_name} ${c.last_name}`.trim(),
      firstName: c.first_name ?? "",
      lastName: c.last_name ?? "",
      city: c.city || null,
      state: c.state || null,
      classYear,
      primaryEmail: c.primary_email || null,
      emailStatus,
      phoneStatus,
      doNotSolicit: bool(c.do_not_solicit),
      deceased: bool(c.deceased),
      assignedStaffId: c.assigned_staff_id || null,
      affiliationTypes: [...new Set(affByC.get(c.id) ?? [])],
      activityNames: [...new Set(actByC.get(c.id) ?? [])].slice(0, 12),
      dataQualityFlags,
      canEmail,
      canPhone,
      gifts,
      paidGiftCount,
      lifetimeGiving,
      averageGift,
      largestGift,
      mostRecentGiftDate: mostRecent?.giftDate ?? null,
      mostRecentGiftAmount: mostRecent?.amount ?? null,
      lastGiftFiscalYear: mostRecent?.fiscalYear ?? null,
      givingYearCount,
      consecutiveGivingYears,
      yearsSinceLastGift,
      currentFiscalYearGiving,
      gaveCurrentYear,
      gavePriorYear,
      amountTrend,
      eventCount: events.length,
      events,
      daysSinceLastInteraction,
      lastInteractionType: lastInteraction?.interaction_type ?? null,
      hasRecurringGift,
      staleAskAmount,
      recentCareerUpdate,
      labels: [],
      scores: {
        renewal: 0,
        upgrade: 0,
        recurring: 0,
        reactivation: 0,
        eventAffinity: 0,
        stewardshipUrgency: 0,
        dataQuality: 0,
      },
      confidence: 0,
    };

    base.labels = labels;
    base.scores = computeScores({ ...base, labels });
    base.confidence = computeConfidence(base);
    profiles.push(base);
  }

  const lybuntCount = profiles.filter((p) => p.labels.includes("lybunt")).length;
  const donorCount = profiles.filter((p) => p.paidGiftCount > 0).length;

  return {
    meta: {
      schoolName: raw.schoolName,
      constituentCount: profiles.length,
      donorCount,
      lybuntCount,
      currentFiscalYear: config.currentFiscalYear,
      generatedAt: new Date().toISOString(),
    },
    profiles,
    campaigns: raw.campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      startsAt: c.starts_at,
      status: c.status,
    })),
  };
}

function countConsecutiveYears(years: number[], through: number): number {
  if (!years.length) return 0;
  const set = new Set(years);
  let count = 0;
  for (let y = through; set.has(y); y--) count++;
  return count;
}

function computeAmountTrend(gifts: GiftSummary[]): number {
  if (gifts.length < 2) return 0;
  const recent = gifts.slice(-3).map((g) => g.amount);
  const older = gifts.slice(-6, -3).map((g) => g.amount);
  if (!older.length) return 0;
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
  if (avgOlder === 0) return 0;
  return (avgRecent - avgOlder) / avgOlder;
}

function detectStaleAsk(
  askAmounts: number[],
  lastGiftAmount: number | null
): number | null {
  if (askAmounts.length < 2 || !lastGiftAmount) return null;
  const lastAsk = askAmounts[askAmounts.length - 1];
  const same = askAmounts.filter((a) => Math.abs(a - lastAsk) < 1).length;
  if (same >= 2 && Math.abs(lastAsk - lastGiftAmount) < 1) return lastAsk;
  return null;
}

export function buildTimeline(profile: ConstituentProfile): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const g of profile.gifts) {
    events.push({
      date: g.giftDate,
      kind: "gift",
      label: "Gift",
      detail: g.giftType,
      amount: g.amount,
    });
  }
  for (const e of profile.events) {
    events.push({
      date: e.attendedAt || e.startsAt,
      kind: "event",
      label: e.eventName,
      detail: "Event attendance",
    });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  if (profile.labels.includes("lybunt")) {
    events.push({
      date: profile.mostRecentGiftDate ?? "",
      kind: "milestone",
      label: "Lapse risk",
      detail: "LYBUNT — gave prior year, not current",
    });
  }
  return events;
}
