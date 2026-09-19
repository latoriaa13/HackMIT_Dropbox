import type { ConstituentProfile, OpportunityEstimate, ProcessedDataset } from "../models/types";
import { estimateOpportunity } from "../opportunity/estimates";
import { sumEstimates } from "../opportunity/estimates";

export type GraphEdge = {
  sourceId: string;
  targetId: string;
  reason: string;
  weight: number;
};

export type PotentialConnector = {
  constituentId: string;
  name: string;
  score: number;
  reasons: string[];
  degree: number;
};

export type Community = {
  id: string;
  name: string;
  sharedCharacteristics: string[];
  memberIds: string[];
  memberCount: number;
  totalHistoricalGiving: number;
  recentGiving: number;
  lapsedDonorCount: number;
  potentialConnectors: PotentialConnector[];
  sampleEdges: GraphEdge[];
  recommendedCampaign: string;
  recommendedAction: string;
  estimatedMinutes: number;
  opportunity: OpportunityEstimate;
};

type CommunitySeed = {
  key: string;
  name: string;
  characteristics: string[];
  memberIds: string[];
};

export function discoverCommunities(
  dataset: ProcessedDataset,
  options?: { minSize?: number; maxCommunities?: number }
): Community[] {
  const minSize = options?.minSize ?? 10;
  const maxCommunities = options?.maxCommunities ?? 24;
  const byId = new Map(dataset.profiles.map((p) => [p.id, p]));

  const seeds: CommunitySeed[] = [];
  const activityMap = new Map<string, string[]>();
  const classMap = new Map<number, string[]>();
  const cityMap = new Map<string, string[]>();
  const eventMap = new Map<string, string[]>();

  for (const p of dataset.profiles) {
    if (p.deceased) continue;
    for (const act of p.activityNames.slice(0, 2)) {
      const list = activityMap.get(act) ?? [];
      list.push(p.id);
      activityMap.set(act, list);
    }
    if (p.classYear) {
      const list = classMap.get(p.classYear) ?? [];
      list.push(p.id);
      classMap.set(p.classYear, list);
    }
    if (p.city) {
      const key = `${p.city}, ${p.state ?? ""}`.trim();
      const list = cityMap.get(key) ?? [];
      list.push(p.id);
      cityMap.set(key, list);
    }
    for (const ev of p.events.slice(0, 1)) {
      const list = eventMap.get(ev.eventName) ?? [];
      list.push(p.id);
      eventMap.set(ev.eventName, list);
    }
  }

  for (const [act, ids] of activityMap) {
    if (ids.length >= minSize) {
      seeds.push({
        key: `activity:${act}`,
        name: `${act}`,
        characteristics: [`Shared activity: ${act}`],
        memberIds: [...new Set(ids)],
      });
    }
  }
  for (const [year, ids] of classMap) {
    if (ids.length >= minSize) {
      seeds.push({
        key: `class:${year}`,
        name: `Class of ${year}`,
        characteristics: [`Same class year: ${year}`],
        memberIds: [...new Set(ids)],
      });
    }
  }
  for (const [city, ids] of cityMap) {
    if (ids.length >= minSize) {
      seeds.push({
        key: `city:${city}`,
        name: `${city} alumni`,
        characteristics: [`Same city: ${city.split(",")[0]}`],
        memberIds: [...new Set(ids)],
      });
    }
  }
  for (const [ev, ids] of eventMap) {
    if (ids.length >= minSize) {
      seeds.push({
        key: `event:${ev}`,
        name: `${ev} attendees`,
        characteristics: [`Both attended: ${ev}`],
        memberIds: [...new Set(ids)],
      });
    }
  }

  seeds.sort((a, b) => b.memberIds.length - a.memberIds.length);
  const topSeeds = seeds.slice(0, maxCommunities);

  return topSeeds.map((seed) => buildCommunity(seed, byId));
}

function buildCommunity(seed: CommunitySeed, byId: Map<string, ConstituentProfile>): Community {
  const members = seed.memberIds.map((id) => byId.get(id)).filter(Boolean) as ConstituentProfile[];
  const totalHistoricalGiving = members.reduce((s, p) => s + p.lifetimeGiving, 0);
  const recentGiving = members.reduce((s, p) => s + p.currentFiscalYearGiving, 0);
  const lapsedDonorCount = members.filter((p) => p.labels.includes("lybunt") || p.labels.includes("sybunt")).length;

  const connectors = findPotentialConnectors(members, seed.characteristics[0] ?? seed.name);
  const sampleEdges = buildSampleEdges(members, seed.characteristics[0] ?? "Shared attribute");

  const { recommendedCampaign, recommendedAction } = recommendForCommunity(members, seed);
  const opps = members.slice(0, 50).map((p) => estimateOpportunity(p, actionForCommunity(members)));
  const opportunity = sumEstimates(opps);

  return {
    id: seed.key,
    name: seed.name,
    sharedCharacteristics: seed.characteristics,
    memberIds: seed.memberIds,
    memberCount: members.length,
    totalHistoricalGiving,
    recentGiving,
    lapsedDonorCount,
    potentialConnectors: connectors.slice(0, 5),
    sampleEdges: sampleEdges.slice(0, 12),
    recommendedCampaign,
    recommendedAction,
    estimatedMinutes: Math.min(480, members.length * 8),
    opportunity,
  };
}

function actionForCommunity(members: ConstituentProfile[]) {
  if (members.some((m) => m.labels.includes("lybunt"))) return "renewal_ask" as const;
  if (members.filter((m) => m.paidGiftCount === 0).length > members.length * 0.5) {
    return "event_invitation" as const;
  }
  return "stewardship_message" as const;
}

function recommendForCommunity(members: ConstituentProfile[], seed: CommunitySeed) {
  if (seed.key.startsWith("event:")) {
    return {
      recommendedCampaign: "Event follow-up conversion",
      recommendedAction: "Event invitation or stewardship for non-donors",
    };
  }
  if (lapsedRatio(members) > 0.3) {
    return {
      recommendedCampaign: "Community reactivation sprint",
      recommendedAction: "Reactivation email or renewal call block",
    };
  }
  if (seed.key.startsWith("class:")) {
    return {
      recommendedCampaign: "Reunion class campaign",
      recommendedAction: "Reunion outreach + renewal asks",
    };
  }
  return {
    recommendedCampaign: "Affinity-based stewardship week",
    recommendedAction: "Stewardship messages and selective renewal calls",
  };
}

function lapsedRatio(members: ConstituentProfile[]) {
  return members.filter((m) => m.labels.includes("lybunt") || m.labels.includes("sybunt")).length / Math.max(members.length, 1);
}

export function findPotentialConnectors(
  members: ConstituentProfile[],
  sharedReason: string
): PotentialConnector[] {
  const memberSet = new Set(members.map((m) => m.id));
  const scored: PotentialConnector[] = [];

  for (const p of members) {
    if (p.deceased || p.doNotSolicit) continue;
    if (!p.canEmail && !p.canPhone) continue;

    let score = 0;
    const reasons: string[] = [];

    const volunteer = p.activityNames.some((a) =>
      /volunteer|committee|captain|leader/i.test(a)
    );
    if (volunteer) {
      score += 0.25;
      reasons.push("Volunteer or committee activity on record");
    }
    if (p.eventCount >= 2) {
      score += 0.15;
      reasons.push("Repeat event attendance");
    }
    if (p.paidGiftCount >= 2) {
      score += 0.2;
      reasons.push("Repeat giving history");
    }
    if (p.activityNames.length >= 2) {
      score += 0.15;
      reasons.push("Multiple shared activities listed");
    }

    const degree = estimateDegree(p, members, memberSet);
    score += Math.min(0.35, degree * 0.05);
    reasons.push(`${degree} observable links within community (${sharedReason})`);

    if (score >= 0.35) {
      scored.push({
        constituentId: p.id,
        name: p.displayName,
        score,
        reasons,
        degree,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.constituentId.localeCompare(b.constituentId));
  return scored;
}

function estimateDegree(
  p: ConstituentProfile,
  members: ConstituentProfile[],
  memberSet: Set<string>
): number {
  let degree = 0;
  for (const other of members) {
    if (other.id === p.id || !memberSet.has(other.id)) continue;
    if (p.classYear && p.classYear === other.classYear) degree++;
    if (p.city && p.city === other.city) degree++;
    if (p.activityNames.some((a) => other.activityNames.includes(a))) degree++;
    if (p.events.some((e) => other.events.some((oe) => oe.eventId === e.eventId))) degree++;
  }
  return degree;
}

function buildSampleEdges(
  members: ConstituentProfile[],
  reasonPrefix: string
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const slice = members.slice(0, 40);
  for (let i = 0; i < slice.length; i++) {
    for (let j = i + 1; j < slice.length && edges.length < 30; j++) {
      const a = slice[i];
      const b = slice[j];
      const shared = sharedAttributes(a, b);
      if (shared.length === 0) continue;
      edges.push({
        sourceId: a.id,
        targetId: b.id,
        reason: shared[0],
        weight: shared.length,
      });
    }
  }
  return edges;
}

function sharedAttributes(a: ConstituentProfile, b: ConstituentProfile): string[] {
  const out: string[] = [];
  if (a.classYear && a.classYear === b.classYear) out.push(`Same class year: ${a.classYear}`);
  if (a.city && a.city === b.city) out.push(`Same city: ${a.city}`);
  const act = a.activityNames.find((x) => b.activityNames.includes(x));
  if (act) out.push(`Shared activity: ${act}`);
  const ev = a.events.find((e) => b.events.some((be) => be.eventId === e.eventId));
  if (ev) out.push(`Both attended ${ev.eventName}`);
  return out;
}

export function getCommunityById(dataset: ProcessedDataset, communityId: string): Community | null {
  return discoverCommunities(dataset).find((c) => c.id === communityId) ?? null;
}
