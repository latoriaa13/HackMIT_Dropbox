import { NextResponse } from "next/server";
import { disconnectMicrosoft365 } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function POST() {
  const userId = await getSessionUserId();
  disconnectMicrosoft365(userId);
  return NextResponse.json({ ok: true, connected: false });
}
