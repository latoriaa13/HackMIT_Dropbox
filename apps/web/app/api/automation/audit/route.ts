import { NextResponse } from "next/server";
import { listAudit } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function GET() {
  const userId = await getSessionUserId();
  return NextResponse.json({ logs: listAudit(userId) });
}
