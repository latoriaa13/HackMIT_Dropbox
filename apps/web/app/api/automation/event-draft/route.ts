import { NextResponse } from "next/server";
import { CreateEventInputSchema, getMicrosoft365Provider, checkEmailOutreachEligible } from "@tuesday/m365";
import { getProfile, loadDataset } from "@/lib/data-store";
import { getSessionUserId } from "@/lib/session";
import { z } from "zod";

const Schema = CreateEventInputSchema.extend({
  constituentId: z.string(),
});

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = Schema.parse(await request.json());
    loadDataset();
    const profile = getProfile(body.constituentId);
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const elig = checkEmailOutreachEligible(profile);
    if (!elig.ok && profile.doNotSolicit) {
      return NextResponse.json({ error: "Cannot schedule", reasons: elig.reasons }, { status: 400 });
    }
    const provider = getMicrosoft365Provider(userId);
    const { constituentId, ...eventInput } = body;
    const draft = await provider.createEventDraft({
      ...eventInput,
      relatedConstituentIds: [constituentId],
    });
    return NextResponse.json({ draft });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
