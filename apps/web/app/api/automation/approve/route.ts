import { NextResponse } from "next/server";
import { z } from "zod";
import {
  appendAudit,
  getEmailDraft,
  getEventDraft,
  getMicrosoft365Provider,
  isM365AuthError,
  recordConstituentActivity,
} from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

const Schema = z.object({
  kind: z.enum(["email", "event"]),
  draftId: z.string(),
  approvalToken: z.string(),
  decision: z.enum(["approve", "reject"]),
});

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = Schema.parse(await request.json());

    if (body.decision === "reject") {
      appendAudit({
        userId,
        actionType: body.kind === "email" ? "mail.send_draft" : "calendar.send_event_invitation",
        target: body.draftId,
        status: "rejected",
        payloadSummary: "User rejected in approval inbox",
      });
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    const provider = getMicrosoft365Provider(userId);
    if (body.kind === "email") {
      const sent = await provider.sendEmailDraft({
        draftId: body.draftId,
        approvalToken: body.approvalToken,
      });
      const draft = getEmailDraft(body.draftId, userId);
      if (draft?.relatedConstituentIds?.[0]) {
        recordConstituentActivity({
          constituentId: draft.relatedConstituentIds[0],
          userId,
          type: "email_sent",
          summary: sent.message,
          status: sent.status,
        });
      }
      return NextResponse.json(sent);
    }

    const sent = await provider.sendEventInvitation({
      draftId: body.draftId,
      approvalToken: body.approvalToken,
    });
    return NextResponse.json(sent);
  } catch (e) {
    if (isM365AuthError(e)) {
      return NextResponse.json(e.toJSON(), { status: 403 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
