import { getPublicM365Session, type PublicM365Session } from "./session-info";
import { getMicrosoftAccount } from "./account-store";
import {
  connectionFlagsFromProbe,
  connectionFlagsFromStoredAccount,
  probeGraphCapabilities,
  type GraphCapabilityProbe,
} from "./graph-capabilities";

export type ResolvedConnectionStatus = {
  pub: PublicM365Session;
  accountLinked: boolean;
  outlookReady: boolean;
  mailAutopilotReady: boolean;
  calendarReady: boolean;
  mailReady: boolean;
  mailReadReady: boolean;
  profileReady: boolean;
  missingCalendarConsent: boolean;
  missingMailConsent: boolean;
  connected: boolean;
  verified: boolean;
  capabilityErrors: GraphCapabilityProbe["errors"];
  grantedScopes: string[];
  probe?: GraphCapabilityProbe;
};

/** Fast path: OAuth grants on file. verify=true: live Graph check (after sign-in). */
export async function resolveConnectionStatus(
  sessionUserId: string,
  options?: { verify?: boolean; forceProbe?: boolean }
): Promise<ResolvedConnectionStatus> {
  const pub = getPublicM365Session(sessionUserId);
  const account = getMicrosoftAccount(sessionUserId);
  const stored = connectionFlagsFromStoredAccount(sessionUserId);

  if (!account) {
    return {
      pub,
      accountLinked: false,
      outlookReady: false,
      mailAutopilotReady: false,
      calendarReady: false,
      mailReady: false,
      mailReadReady: false,
      profileReady: false,
      missingCalendarConsent: true,
      missingMailConsent: true,
      connected: false,
      verified: false,
      capabilityErrors: {},
      grantedScopes: [],
    };
  }

  if (!options?.verify) {
    const scopes = account.grantedScopes ?? pub.grantedScopes ?? [];
    return {
      pub,
      accountLinked: true,
      outlookReady: stored.outlookReady,
      mailAutopilotReady: stored.mailAutopilotReady,
      calendarReady: stored.calendarReady,
      mailReady: stored.mailReady,
      mailReadReady: stored.mailReadReady,
      profileReady: stored.profileReady,
      missingCalendarConsent: stored.missingCalendarConsent,
      missingMailConsent: stored.missingMailConsent,
      connected: stored.outlookReady || stored.mailAutopilotReady,
      verified: false,
      capabilityErrors: {},
      grantedScopes: scopes,
    };
  }

  const probe = await probeGraphCapabilities(sessionUserId, { force: options.forceProbe === true });
  const flags = connectionFlagsFromProbe(probe, true, account.email);
  return {
    pub,
    accountLinked: true,
    outlookReady: flags.outlookReady,
    mailAutopilotReady: flags.mailAutopilotReady,
    calendarReady: flags.calendarReady,
    mailReady: flags.mailReady,
    mailReadReady: flags.mailReadReady,
    profileReady: flags.profileReady,
    missingCalendarConsent: flags.missingCalendarConsent,
    missingMailConsent: flags.missingMailConsent,
    connected: flags.outlookReady || flags.mailAutopilotReady,
    verified: true,
    capabilityErrors: probe.errors,
    grantedScopes: probe.tokenScopes.length ? probe.tokenScopes : account.grantedScopes,
    probe,
  };
}
