import { clearMicrosoftAccount } from "./account-store";
import { clearMsalCache } from "./msal-cache-store";
import { clearOAuthStatesForSession } from "./oauth-state-store";
import { invalidateCapabilityCache } from "./graph-capabilities";

export function disconnectMicrosoft365(sessionUserId: string) {
  clearMicrosoftAccount(sessionUserId);
  clearMsalCache(sessionUserId);
  clearOAuthStatesForSession(sessionUserId);
  invalidateCapabilityCache(sessionUserId);
}
