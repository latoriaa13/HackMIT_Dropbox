import { NextResponse } from "next/server";
import { discoverCommunities } from "@tuesday/core";
import { loadDataset } from "@/lib/data-store";

export async function GET() {
  try {
    const dataset = loadDataset();
    const communities = discoverCommunities(dataset);
    return NextResponse.json({ communities });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Communities failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
