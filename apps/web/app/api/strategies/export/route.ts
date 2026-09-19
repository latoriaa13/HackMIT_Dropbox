import { NextResponse } from "next/server";
import { getStrategyPlan, ACTION_LABELS, StrategyPresetIdSchema } from "@tuesday/core";
import { loadDataset } from "@/lib/data-store";
import { z } from "zod";
import { ChannelSchema, RiskPreferenceSchema } from "@tuesday/core";

const ExportSchema = z.object({
  strategyId: StrategyPresetIdSchema,
  staffHours: z.number().min(1).max(40),
  channels: z.array(ChannelSchema).min(1),
  riskPreference: RiskPreferenceSchema.optional(),
});

function csvEscape(v: string | number): string {
  const s = String(v);
  if (s.includes(",") || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function POST(request: Request) {
  try {
    const body = ExportSchema.parse(await request.json());
    const dataset = loadDataset();
    const plan = getStrategyPlan(
      dataset,
      body.strategyId,
      body.staffHours,
      body.channels,
      body.riskPreference
    );
    const header =
      "constituent_id,name,action,channel,minutes,expected_opportunity,priority,confidence";
    const lines = plan.items.map((i) =>
      [
        i.constituentId,
        i.constituentName,
        ACTION_LABELS[i.recommendedAction],
        i.channel,
        i.estimatedMinutes,
        i.expectedOpportunity.toFixed(2),
        i.priorityScore.toFixed(4),
        i.confidence.toFixed(2),
      ]
        .map(csvEscape)
        .join(",")
    );
    const csv = [header, ...lines].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="strategy-${body.strategyId}.csv"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
