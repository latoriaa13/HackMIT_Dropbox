import { isM365Configured } from "../config/env";
import { hasMicrosoftConnection } from "../auth/account-store";
import type { Microsoft365Provider } from "./interface";
import { MockMicrosoft365Provider } from "./mock-provider";
import { MicrosoftGraphProvider } from "./graph-provider";

export function getMicrosoft365Provider(sessionUserId: string): Microsoft365Provider {
  if (isM365Configured() && hasMicrosoftConnection(sessionUserId)) {
    return new MicrosoftGraphProvider(sessionUserId);
  }
  return new MockMicrosoft365Provider(sessionUserId);
}

export function getProviderMode(sessionUserId: string): "mock" | "microsoft_graph" {
  if (isM365Configured() && hasMicrosoftConnection(sessionUserId)) return "microsoft_graph";
  return "mock";
}
