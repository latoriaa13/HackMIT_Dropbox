import {
  ConfidentialClientApplication,
  type ConfidentialClientApplication as Cca,
} from "@azure/msal-node";
import { getM365Env, isM365Configured } from "../config/env";
import { readMsalCacheSerialized, writeMsalCacheSerialized } from "./msal-cache-store";

export function createMsalClient(options?: {
  requireSecret?: boolean;
  authoritySegment?: string;
}): Cca {
  const env = getM365Env();
  if (!env.clientId) {
    throw new Error("Microsoft 365 OAuth is not configured");
  }
  if (options?.requireSecret !== false && !env.clientSecret) {
    throw new Error("Microsoft 365 OAuth is not configured");
  }
  const segment = options?.authoritySegment?.trim() || env.tenantId || "common";
  return new ConfidentialClientApplication({
    auth: {
      clientId: env.clientId,
      clientSecret: env.clientSecret ?? "",
      authority: `https://login.microsoftonline.com/${segment}`,
    },
  });
}

export async function loadMsalCacheIntoClient(client: Cca, sessionUserId: string) {
  const serialized = readMsalCacheSerialized(sessionUserId);
  if (serialized) {
    client.getTokenCache().deserialize(serialized);
  }
}

export async function persistMsalCacheFromClient(client: Cca, sessionUserId: string) {
  const serialized = client.getTokenCache().serialize();
  writeMsalCacheSerialized(sessionUserId, serialized);
}

export async function getAuthCodeUrl(input: {
  state: string;
  nonce: string;
  scopes: string[];
  authoritySegment?: string;
  /** Use consent when adding calendar/mail to an existing Microsoft session. */
  prompt?: "consent" | "select_account" | "login";
}): Promise<string> {
  const client = createMsalClient({
    requireSecret: false,
    authoritySegment: input.authoritySegment,
  });
  const env = getM365Env();
  return client.getAuthCodeUrl({
    scopes: input.scopes,
    redirectUri: env.redirectUri,
    state: input.state,
    nonce: input.nonce,
    prompt: input.prompt ?? "select_account",
  });
}

export async function exchangeCodeAndPersist(
  sessionUserId: string,
  code: string,
  scopes: string[],
  authoritySegment?: string
) {
  const client = createMsalClient({ authoritySegment });
  await loadMsalCacheIntoClient(client, sessionUserId);
  const env = getM365Env();
  const result = await client.acquireTokenByCode({
    code,
    scopes,
    redirectUri: env.redirectUri,
  });
  if (!result?.accessToken) throw new Error("Token exchange failed");
  await persistMsalCacheFromClient(client, sessionUserId);
  return result;
}

export { isM365Configured };
