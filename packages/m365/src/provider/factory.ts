import { isM365Configured } from "../config/env";
import { hasMicrosoftConnection } from "../auth/account-store";
import {
  Microsoft365ConfigurationError,
  Microsoft365NotConnectedError,
} from "../http/api-errors";
import type { Microsoft365Provider } from "./interface";
import { MicrosoftGraphProvider } from "./graph-provider";

export function requireMicrosoft365Provider(sessionUserId: string): MicrosoftGraphProvider {
  if (!isM365Configured()) {
    throw new Microsoft365ConfigurationError();
  }
  if (!hasMicrosoftConnection(sessionUserId)) {
    throw new Microsoft365NotConnectedError();
  }
  return new MicrosoftGraphProvider(sessionUserId);
}

/** @deprecated Use requireMicrosoft365Provider — never returns a mock implementation. */
export function getMicrosoft365Provider(sessionUserId: string): Microsoft365Provider {
  return requireMicrosoft365Provider(sessionUserId);
}

export function isMicrosoft365Connected(sessionUserId: string): boolean {
  return isM365Configured() && hasMicrosoftConnection(sessionUserId);
}
