import { NextResponse } from "next/server";
import { m365ErrorToHttpResponse } from "@tuesday/m365";

export function m365ApiErrorResponse(e: unknown) {
  const { status, body } = m365ErrorToHttpResponse(e);
  return NextResponse.json(body, { status });
}
