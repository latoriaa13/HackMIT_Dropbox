import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkEmailOutreachEligible,
  generateFollowUpEmail,
  getMicrosoft365Provider,
  recordConstituentActivity,
} from "@tuesday/m365";
import { getProfile, loadDataset } from "@/lib/data-store";
import { getSessionUserId } from "@/lib/session";

const Schema = z.object({
  constituentId: z.string(),
  recommendedAction: z.string().optional(),
  whyNow: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = Schema.parse(await request.json());
    loadDataset();
    const profile = getProfile(body.constituentId);
    if (!profile) return NextResponse.json({ error: "Constituent not found" }, { status: 404 });

    const elig = checkEmailOutreachEligible(profile);
    if (!elig.ok) {
      return NextResponse.json({ error: "Cannot draft email", reasons: elig.reasons }, { status: 400 });
    }

    const { subject, body: text } = generateFollowUpEmail(profile, {
      recommendedAction: body.recommendedAction,
      whyNow: body.whyNow,
    });
    const provider = getMicrosoft365Provider(userId);
    const draft = await provider.createEmailDraft({
      to: [elig.to!],
      subject,
      body: text,
      relatedConstituentIds: [profile.id],
    });

    recordConstituentActivity({
      constituentId: profile.id,
      userId,
      type: "email_draft",
      summary: subject,
      status: "awaiting_approval",
    });

    return NextResponse.json({ draft, subject, body: text, mode: draft.mode });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
