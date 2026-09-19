import { NextResponse } from "next/server";
import { buildTuesday, BuildTuesdayInputSchema } from "@tuesday/core";
import { loadDataset } from "@/lib/data-store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = BuildTuesdayInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const dataset = loadDataset();
    const result = buildTuesday(dataset, parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Build failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
