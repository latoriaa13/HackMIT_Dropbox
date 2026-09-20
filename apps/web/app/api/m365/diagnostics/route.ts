import { NextResponse } from "next/server";
import {
  getMicrosoftAccount,
  isM365Configured,
  probeGraphCapabilities,
} from "@tuesday/m365";
import { getSessionUserId } from "@/lib/session";

/** Dev helper — no secrets; explains why Outlook calendar may fail. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const sessionUserId = await getSessionUserId();
  const account = getMicrosoftAccount(sessionUserId);
  let probe = null;
  if (account) {
    probe = await probeGraphCapabilities(sessionUserId, { force: true });
  }

  const email = account?.email ?? "";
  const guestExt = email.includes("#EXT#") || email.includes("#ext#");
  const hints: string[] = [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI ?? "";
  hints.push(
    `Use one dev URL only (configured ${appUrl}). OAuth callback is ${redirectUri}. If Next.js moved to port 3001, stop the other process and restart dev.`
  );

  if (guestExt) {
    hints.push(
      "Your Microsoft sign-in is a guest (#EXT#) in the app tenant. Graph returns 401 for calendar/mail on that identity. Disconnect, then use Connect — personal (outlook.com) so login uses the native Outlook account."
    );
  }
  if (account && probe && probe.profile && !probe.calendar) {
    hints.push(
      "Profile works but calendar does not — usually wrong account type (guest) or Entra app must allow personal Microsoft accounts under Authentication → Supported account types."
    );
  }
  if (!isM365Configured()) {
    hints.push("Microsoft OAuth env vars are missing — copy .env.example to .env.local.");
  }

  return NextResponse.json({
    sessionUserId,
    accountLinked: Boolean(account),
    accountEmail: account?.email ?? null,
    authAuthoritySegment: account?.authAuthoritySegment ?? null,
    grantedScopes: account?.grantedScopes ?? [],
    guestExternal: guestExt,
    probe: probe
      ? {
          profile: probe.profile,
          calendar: probe.calendar,
          mail: probe.mail,
          errors: probe.errors,
          identity: probe.identity,
        }
      : null,
    hints,
  });
}
