import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/session";

const COOKIE = "donorex_onboarded";

export async function POST(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { ...sessionCookieOptions(secure), maxAge: 0 });
  return res;
}
