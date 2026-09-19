import { NextResponse } from "next/server";
import { getCommunityById, buildCampaignFromCommunity, StrategyPresetIdSchema } from "@tuesday/core";
import { loadDataset } from "@/lib/data-store";
import { z } from "zod";
import { ChannelSchema } from "@tuesday/core";

const Schema = z.object({
  communityId: z.string(),
  campaignName: z.string().optional(),
  strategyId: StrategyPresetIdSchema.optional(),
  staffHours: z.number().min(1).max(40).optional(),
  channels: z.array(ChannelSchema).optional(),
});

export async function POST(request: Request) {
  try {
    const body = Schema.parse(await request.json());
    const dataset = loadDataset();
    const community = getCommunityById(dataset, body.communityId);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    const plan = buildCampaignFromCommunity(community, dataset.profiles, {
      campaignName: body.campaignName,
      strategyId: body.strategyId,
      staffHours: body.staffHours,
      channels: body.channels,
    });
    return NextResponse.json(plan);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Campaign build failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
