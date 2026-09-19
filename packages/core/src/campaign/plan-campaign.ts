import type { BuildTuesdayInput, StrategyPresetId } from "../models/types";
import type { Community } from "../graph/communities";
import type { ConstituentProfile, OpportunityEstimate } from "../models/types";
import { presetToBuildInput } from "../strategies/presets";
import { buildPortfolioFromProfiles } from "../optimize/weekly-queue";

export type CampaignPlan = {
  campaignName: string;
  objective: string;
  targetCommunityId: string;
  targetCommunityName: string;
  targetConstituentCount: number;
  recommendedChannel: string;
  staffActions: string[];
  recommendedConnectors: Array<{ id: string; name: string; reasons: string[] }>;
  askRange: { low: number; high: number } | null;
  messageAngle: string;
  staffHoursEstimate: number;
  opportunity: OpportunityEstimate;
  taskList: Array<{
    constituentId: string;
    name: string;
    action: string;
    channel: string;
    minutes: number;
  }>;
};

export function buildCampaignFromCommunity(
  community: Community,
  profiles: ConstituentProfile[],
  options: {
    campaignName?: string;
    strategyId?: StrategyPresetId;
    staffHours?: number;
    channels?: BuildTuesdayInput["channels"];
  }
): CampaignPlan {
  const strategyId = options.strategyId ?? "balanced_portfolio";
  const staffHours = options.staffHours ?? 8;
  const channels = options.channels ?? ["phone", "email", "event_invitation", "stewardship_message"];
  const input = presetToBuildInput(strategyId, staffHours, channels);

  const members = profiles.filter((p) => community.memberIds.includes(p.id) && !p.deceased);
  const built = buildPortfolioFromProfiles(members, input);

  const gifts = members.filter((m) => m.mostRecentGiftAmount).map((m) => m.mostRecentGiftAmount!);
  const askRange =
    gifts.length > 0
      ? { low: Math.min(...gifts), high: Math.max(...gifts) }
      : null;

  return {
    campaignName: options.campaignName ?? `${community.name} — ${community.recommendedCampaign}`,
    objective: input.objective,
    targetCommunityId: community.id,
    targetCommunityName: community.name,
    targetConstituentCount: members.length,
    recommendedChannel: dominantChannel(built.actions),
    staffActions: [...new Set(built.actions.map((a) => a.actionType))].slice(0, 6),
    recommendedConnectors: community.potentialConnectors.map((c) => ({
      id: c.constituentId,
      name: c.name,
      reasons: c.reasons,
    })),
    askRange,
    messageAngle: community.sharedCharacteristics.join("; "),
    staffHoursEstimate: staffHours,
    opportunity: built.summary.totals,
    taskList: built.items.map((i) => ({
      constituentId: i.constituentId,
      name: i.constituentName,
      action: i.recommendedAction,
      channel: i.channel,
      minutes: i.estimatedMinutes,
    })),
  };
}

function dominantChannel(actions: { channel: string }[]): string {
  const counts = new Map<string, number>();
  for (const a of actions) {
    counts.set(a.channel, (counts.get(a.channel) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "email";
}
