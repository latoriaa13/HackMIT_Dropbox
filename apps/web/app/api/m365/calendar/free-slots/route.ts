import { NextResponse } from "next/server";
import { FindFreeSlotsInputSchema, requireMicrosoft365Provider } from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";
import { m365ApiErrorResponse } from "@/lib/m365-response";

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    const body = FindFreeSlotsInputSchema.parse(await request.json());
    const provider = requireMicrosoft365Provider(userId);
    const slots = await provider.findFreeSlots(body);
    return NextResponse.json({ slots });
  } catch (e) {
    return m365ApiErrorResponse(e);
  }
}
