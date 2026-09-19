import { NextResponse } from "next/server";
import { runSegmentQuery } from "@tuesday/core";
import { loadDataset } from "@/lib/data-store";

export async function POST(request: Request) {
  if (process.env.ENABLE_SEGMENTS === "false") {
    return NextResponse.json(
      { error: "Segment discovery is disabled for this demo build." },
      { status: 403 }
    );
  }
  try {
    const body = await request.json();
    const query = String(body.query ?? "");
    const limit = Number(body.limit ?? 20);
    const dataset = loadDataset();
    const result = runSegmentQuery(dataset, query, limit);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Segment query failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
