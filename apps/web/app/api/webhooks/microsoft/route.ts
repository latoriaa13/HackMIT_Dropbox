import { NextResponse } from "next/server";

/** Graph subscription validation & notifications (placeholder). */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({
    received: true,
    note: "Webhook processing not enabled in MVP — use Run now on automation tasks.",
  });
}
