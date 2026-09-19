import { NextResponse } from "next/server";
import { getEmailDraft, getEventDraft, listPendingDrafts } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  const pending = listPendingDrafts(userId);
  const emails = pending.emails.map((d) => {
    const full = getEmailDraft(d.draftId, userId);
    return { ...d, body: full?.body };
  });
  const events = pending.events.map((d) => {
    const full = getEventDraft(d.draftId, userId);
    return { ...d, body: full?.body };
  });
  return NextResponse.json({ emails, events });
}
