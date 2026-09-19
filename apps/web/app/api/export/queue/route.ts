import { NextResponse } from "next/server";
import { buildTuesday, BuildTuesdayInputSchema, ACTION_LABELS } from "@tuesday/core";
import { loadDataset } from "@/lib/data-store";

function csvEscape(v: string | number): string {
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = BuildTuesdayInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const dataset = loadDataset();
    const result = buildTuesday(dataset, parsed.data);
    const header =
      "date,weekday,start_time,end_time,step_kind,title,detail,constituent_id,action,expected_opportunity";
    const lines = result.calendar.steps.map((s) => {
      const step = s as {
        date: string;
        weekday: string;
        startTime: string;
        endTime: string;
        kind: string;
        title: string;
        detail: string;
        constituentId?: string;
        action?: string;
        expectedOpportunity?: number;
      };
      return [
        step.date,
        step.weekday,
        step.startTime,
        step.endTime,
        step.kind,
        step.title,
        step.detail,
        step.constituentId ?? "",
        step.action ? ACTION_LABELS[step.action as keyof typeof ACTION_LABELS] ?? step.action : "",
        step.expectedOpportunity?.toFixed(2) ?? "",
      ]
        .map(csvEscape)
        .join(",");
    });
    const csv = [header, ...lines].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="tuesday-calendar.csv"',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
