import { NextResponse } from "next/server";
import {
  buildTimeline,
  selectBestAction,
  buildDetailedExplanation,
  planDonorJourney,
  listActionOptions,
  BuildTuesdayInputSchema,
  type BuildTuesdayInput,
} from "@tuesday/core";
import { getProfile, loadDataset } from "@/lib/data-store";

const defaultInput: BuildTuesdayInput = {
  objective: "protect_renewals",
  staffHours: 8,
  channels: ["phone", "email", "event_invitation", "stewardship_message"],
  riskPreference: "balanced",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    let input = defaultInput;
    const q = url.searchParams.get("plan");
    if (q) {
      try {
        input = BuildTuesdayInputSchema.parse(JSON.parse(q));
      } catch {
        /* use default */
      }
    }

    loadDataset();
    const profile = getProfile(id);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const recommendation = selectBestAction(profile, input);
    const timeline = buildTimeline(profile);
    const actionOptions = listActionOptions(profile, input);
    const explanation = buildDetailedExplanation(profile, input);
    const journey = planDonorJourney(profile);

    return NextResponse.json({
      profile,
      recommendation,
      timeline,
      actionOptions,
      explanation,
      journey,
      planInput: input,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
