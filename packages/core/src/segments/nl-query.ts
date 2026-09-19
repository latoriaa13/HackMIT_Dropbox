import type { ConstituentProfile, ProcessedDataset, SegmentQueryResult } from "../models/types";
import { sumEstimates } from "../opportunity/estimates";
import { estimateOpportunity } from "../opportunity/estimates";

export function runSegmentQuery(
  dataset: ProcessedDataset,
  query: string,
  limit = 20
): SegmentQueryResult {
  const q = query.toLowerCase().trim();
  const unsupportedSignals: string[] = [];

  if (/promotion|wealth|net worth|salary/.test(q)) {
    unsupportedSignals.push("Employment promotions and wealth are not in this dataset.");
  }

  let filtered: ConstituentProfile[] = dataset.profiles.filter((p) => !p.deceased);
  let segmentName = "Custom segment";
  let description = "Constituents matching your query.";
  let recommendedCampaign = "FY Annual Fund outreach";
  let sharedCharacteristics: string[] = [];

  if (/giving day|before giving/.test(q)) {
    segmentName = "Giving Day priority outreach";
    description =
      "Renewal-risk and LYBUNT donors with contact info — highest urgency before Giving Day.";
    recommendedCampaign =
      dataset.campaigns.find((c) => /giving day/i.test(c.name))?.name ??
      "GiveCampus University Giving Day 2026";
    filtered = filtered.filter(
      (p) =>
        (p.labels.includes("lybunt") || p.labels.includes("renewal_candidate")) &&
        (p.canEmail || p.canPhone) &&
        !p.doNotSolicit
    );
    sharedCharacteristics = ["LYBUNT or renewal candidate", "Contactable", "Giving Day timing"];
  } else if (/loyal.*not given|not given this year|lybunt/.test(q)) {
    segmentName = "Loyal donors not yet renewed";
    description = "Donors who gave last fiscal year but not yet this year.";
    filtered = filtered.filter(
      (p) => p.labels.includes("lybunt") && p.labels.includes("loyal_donor")
    );
    if (!/loyal/.test(q)) {
      filtered = dataset.profiles.filter((p) => p.labels.includes("lybunt"));
    }
    sharedCharacteristics = ["LYBUNT", "Prior giving history"];
    recommendedCampaign = "Protect renewals calling block";
  } else if (/chicago.*event.*never|event.*never donated/.test(q)) {
    segmentName = "Event-attended prospects without gifts";
    description = "Constituents who attended events but have no paid gifts.";
    const cityMatch = q.match(/in\s+([a-z]+)/);
    const city = cityMatch?.[1] ?? "";
    filtered = filtered.filter(
      (p) =>
        p.eventCount > 0 &&
        p.paidGiftCount === 0 &&
        (!city || (p.city ?? "").toLowerCase().includes(city))
    );
    sharedCharacteristics = ["Event attendance", "Never donor", city ? `City: ${city}` : "Any city"];
    recommendedCampaign = "Event conversion stewardship";
  } else if (/same amount|same ask|several years/.test(q)) {
    segmentName = "Stale ask amounts";
    description = "Interactions show repeated ask amounts aligned with last gift — upgrade conversation may be overdue.";
    filtered = filtered.filter((p) => p.staleAskAmount !== null);
    sharedCharacteristics = ["Repeated ask_amount in interactions", "Matches last gift size"];
    recommendedCampaign = "Upgrade conversation pilot";
  } else if (/recurring/.test(q)) {
    segmentName = "Recurring gift candidates";
    description = "Annual givers without an active recurring gift record.";
    filtered = filtered.filter(
      (p) => p.labels.includes("recurring_candidate") && !p.hasRecurringGift && p.canEmail
    );
    sharedCharacteristics = ["Recurring candidate label", "No recurring_parent gift", "Deliverable email"];
    recommendedCampaign = "Monthly giving conversion";
  } else if (/group|common|segment|club|class/.test(q)) {
    const byActivity = clusterByActivity(filtered);
    const top = byActivity[0];
    segmentName = top ? `Cluster: ${top.name}` : "Affinity clusters";
    description = top
      ? `${top.members.length} constituents share activity ${top.name}.`
      : "Grouped by shared activity affiliation.";
    filtered = top?.members ?? filtered.slice(0, limit);
    sharedCharacteristics = top ? [`Shared activity: ${top.name}`, `Count: ${top.members.length}`] : [];
    recommendedCampaign = "Affinity-based reunion or volunteer invite";
  } else if (/young alumni/.test(q)) {
    segmentName = "Young alumni";
    const year = dataset.meta.currentFiscalYear;
    filtered = filtered.filter((p) => p.classYear !== null && p.classYear >= year - 15);
    description = "Alumni within 15 years of class year.";
    sharedCharacteristics = ["Class year within 15 years"];
    recommendedCampaign = "Young alumni engagement";
  } else {
    filtered = filtered.filter(
      (p) => p.labels.includes("renewal_candidate") || p.labels.includes("lybunt")
    );
    description = "Default: renewal-focused constituents (try example prompts for more specific segments).";
    segmentName = "Renewal-focused portfolio slice";
    sharedCharacteristics = ["Renewal candidate or LYBUNT"];
  }

  filtered.sort((a, b) => b.lifetimeGiving - a.lifetimeGiving);
  const slice = filtered.slice(0, limit);
  const opps = slice.map((p) => estimateOpportunity(p, "renewal_ask"));
  const opportunity = sumEstimates(opps);

  return {
    segmentName,
    description,
    count: filtered.length,
    sharedCharacteristics,
    recommendedCampaign,
    opportunity,
    constituents: slice.map((p) => ({
      id: p.id,
      name: p.displayName,
      classYear: p.classYear,
      city: p.city,
      lifetimeGiving: p.lifetimeGiving,
      labels: p.labels,
    })),
    unsupportedSignals,
  };
}

function clusterByActivity(profiles: ConstituentProfile[]) {
  const map = new Map<string, ConstituentProfile[]>();
  for (const p of profiles) {
    for (const name of p.activityNames.slice(0, 1)) {
      const list = map.get(name) ?? [];
      list.push(p);
      map.set(name, list);
    }
  }
  return [...map.entries()]
    .map(([name, members]) => ({ name, members }))
    .filter((c) => c.members.length >= 10)
    .sort((a, b) => b.members.length - a.members.length);
}
