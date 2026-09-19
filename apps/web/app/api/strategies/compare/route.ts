import { NextResponse } from "next/server";
import {
  compareStrategies,
  StrategyPresetIdSchema,
  ChannelSchema,
  RiskPreferenceSchema,
} from "@tuesday/core";
import { loadDataset } from "@/lib/data-store";
import { z } from "zod";

const CompareSchema = z.object({
  staffHours: z.number().min(1).max(40),
  channels: z.array(ChannelSchema).min(1),
  riskPreference: RiskPreferenceSchema.optional(),
  strategyIds: z.array(StrategyPresetIdSchema).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = CompareSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const dataset = loadDataset();
    const result = compareStrategies(dataset, parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Compare failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
