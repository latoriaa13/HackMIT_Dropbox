import { NextResponse } from "next/server";
import { getPublicM365Session } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const sessionUserId = await getSessionUserId();
  const session = getPublicM365Session(sessionUserId);
  return NextResponse.json(session);
}
