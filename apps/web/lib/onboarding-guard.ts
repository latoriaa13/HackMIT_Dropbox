import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasMicrosoftConnection } from "@tuesday/m365";
import { getServerSession } from "@/lib/session";

const ONBOARDED_COOKIE = "donorex_onboarded";

export function hasCompletedOnboarding(cookieValue: string | undefined): boolean {
  return cookieValue === "1";
}

/** Send users to welcome until they finish onboarding (connect + continue). */
export async function requireMicrosoftAccountLinked(): Promise<string> {
  const jar = await cookies();
  if (!hasCompletedOnboarding(jar.get(ONBOARDED_COOKIE)?.value)) {
    redirect("/welcome");
  }

  const { sessionId } = await getServerSession();
  if (!sessionId || !hasMicrosoftConnection(sessionId)) {
    redirect("/welcome");
  }
  return sessionId;
}
