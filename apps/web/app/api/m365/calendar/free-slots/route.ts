import { NextResponse } from "next/server";
import { FindFreeSlotsInputSchema, getMicrosoft365Provider, isM365AuthError } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = FindFreeSlotsInputSchema.parse(await request.json());
    const provider = getMicrosoft365Provider(userId);
    const slots = await provider.findFreeSlots(body);
    return NextResponse.json({ slots });
  } catch (e) {
    if (isM365AuthError(e)) {
      return NextResponse.json(e.toJSON(), { status: 403 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
