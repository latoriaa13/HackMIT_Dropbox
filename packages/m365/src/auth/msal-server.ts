import {
  ConfidentialClientApplication,
  type ConfidentialClientApplication as Cca,
} from "@azure/msal-node";
import { getM365Env, isM365Configured } from "../config/env";
import { scopesForConsent, type ConsentKind } from "./scopes";
import { readMsalCacheSerialized, writeMsalCacheSerialized } from "./msal-cache-store";

export function createMsalClient(): Cca {
  const env = getM365Env();
  if (!env.clientId || !env.clientSecret) {
    throw new Error("Microsoft 365 OAuth is not configured");
  }
  return new ConfidentialClientApplication({
    auth: {
      clientId: env.clientId,
      clientSecret: env.clientSecret,
      authority: `https://login.microsoftonline.com/${env.tenantId}`,
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
  consent?: ConsentKind;
}): Promise<string> {
  const client = createMsalClient();
  const env = getM365Env();
  const scopes = scopesForConsent(input.consent ?? "full");
  return client.getAuthCodeUrl({
    scopes,
    redirectUri: env.redirectUri,
    state: input.state,
    nonce: input.nonce,
    prompt: "select_account",
  });
}

export async function exchangeCodeAndPersist(sessionUserId: string, code: string, scopes: string[]) {
  const client = createMsalClient();
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
