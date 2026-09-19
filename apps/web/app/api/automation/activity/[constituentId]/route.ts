import { NextResponse } from "next/server";
import { listConstituentActivity } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ constituentId: string }> }
) {
  const { constituentId } = await ctx.params;
  const userId = await getSessionUserId();
  return NextResponse.json({
    activity: listConstituentActivity(constituentId, userId),
  });
}
