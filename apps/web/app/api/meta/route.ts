import { NextResponse } from "next/server";
import { loadDataset } from "@/lib/data-store";

export async function GET() {
  try {
    const dataset = loadDataset();
    return NextResponse.json({
      meta: dataset.meta,
      campaigns: dataset.campaigns.slice(0, 8),
      segmentsEnabled: process.env.ENABLE_SEGMENTS !== "false",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load data";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
