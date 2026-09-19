import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  _resetOAuthStateStore,
  consumeOAuthState,
  createOAuthState,
  disconnectMicrosoft365,
  getPublicM365Session,
  getProviderMode,
  hasMicrosoftConnection,
  saveMicrosoftAccount,
  requiresApproval,
} from "../index";
import { readMsalCacheSerialized, writeMsalCacheSerialized } from "./msal-cache-store";

const tmpDir = path.join(os.tmpdir(), `tuesday-m365-auth-${process.pid}`);

describe("Microsoft OAuth session", () => {
  beforeEach(() => {
    process.env.TUESDAY_DATA_DIR = path.join(tmpDir, String(Date.now()));
    fs.mkdirSync(process.env.TUESDAY_DATA_DIR, { recursive: true });
    delete process.env.MICROSOFT_CLIENT_ID;
    delete process.env.MICROSOFT_CLIENT_SECRET;
    _resetOAuthStateStore();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("uses mock provider when OAuth is not configured", () => {
    const session = getPublicM365Session("user-a");
    expect(session.provider).toBe("mock");
    expect(session.connected).toBe(false);
    expect(getProviderMode("user-a")).toBe("mock");
  });

  it("reports microsoft-graph disconnected when OAuth configured but not signed in", () => {
    process.env.MICROSOFT_CLIENT_ID = "test-client";
    process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
    const session = getPublicM365Session("user-b");
    expect(session.provider).toBe("microsoft-graph");
    expect(session.connected).toBe(false);
    expect(getProviderMode("user-b")).toBe("mock");
  });

  it("connected session reports Microsoft Graph provider", () => {
    process.env.MICROSOFT_CLIENT_ID = "test-client";
    process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
    saveMicrosoftAccount({
      sessionUserId: "user-c",
      homeAccountId: "home-1",
      displayName: "Alex Officer",
      email: "alex@example.com",
      tenantId: "tenant-1",
      grantedScopes: ["User.Read", "Calendars.Read", "Mail.Send"],
      connectedAt: new Date().toISOString(),
    });
    const session = getPublicM365Session("user-c");
    expect(session.connected).toBe(true);
    expect(session.provider).toBe("microsoft-graph");
    expect(session.email).toBe("alex@example.com");
    expect(getProviderMode("user-c")).toBe("microsoft_graph");
  });

  it("rejects invalid OAuth state", () => {
    expect(consumeOAuthState("not-a-real-state")).toBeNull();
  });

  it("consumes valid OAuth state once", () => {
    const { state } = createOAuthState("sess-1", ["User.Read"]);
    const pending = consumeOAuthState(state);
    expect(pending?.sessionId).toBe("sess-1");
    expect(consumeOAuthState(state)).toBeNull();
  });

  it("session info never includes token fields", () => {
    process.env.MICROSOFT_CLIENT_ID = "c";
    process.env.MICROSOFT_CLIENT_SECRET = "s";
    writeMsalCacheSerialized("user-d", '{"AccessToken":{"secret":"never"}}');
    saveMicrosoftAccount({
      sessionUserId: "user-d",
      homeAccountId: "h",
      displayName: "D",
      email: "d@e.com",
      tenantId: "t",
      grantedScopes: ["User.Read"],
      connectedAt: new Date().toISOString(),
    });
    const session = getPublicM365Session("user-d");
    const json = JSON.stringify(session);
    expect(json).not.toMatch(/accessToken|refreshToken|clientSecret/i);
    expect(readMsalCacheSerialized("user-d")).toContain("AccessToken");
  });

  it("disconnect clears Microsoft link and encrypted cache", () => {
    process.env.MICROSOFT_CLIENT_ID = "c";
    process.env.MICROSOFT_CLIENT_SECRET = "s";
    saveMicrosoftAccount({
      sessionUserId: "user-e",
      homeAccountId: "h",
      displayName: "E",
      email: "e@e.com",
      tenantId: "t",
      grantedScopes: ["User.Read"],
      connectedAt: new Date().toISOString(),
    });
    writeMsalCacheSerialized("user-e", "{}");
    disconnectMicrosoft365("user-e");
    expect(hasMicrosoftConnection("user-e")).toBe(false);
    expect(readMsalCacheSerialized("user-e")).toBeNull();
  });

  it("still requires approval before send operations", () => {
    expect(requiresApproval("mail.send")).toBe(true);
    expect(requiresApproval("calendar.send_event_invitation")).toBe(true);
  });

  it("missing calendar scopes flag consent gap", () => {
    process.env.MICROSOFT_CLIENT_ID = "c";
    process.env.MICROSOFT_CLIENT_SECRET = "s";
    saveMicrosoftAccount({
      sessionUserId: "user-f",
      homeAccountId: "h",
      displayName: "F",
      email: "f@e.com",
      tenantId: "t",
      grantedScopes: ["User.Read", "Mail.Read"],
      connectedAt: new Date().toISOString(),
    });
    const session = getPublicM365Session("user-f");
    expect(session.missingCalendarConsent).toBe(true);
    expect(session.missingMailConsent).toBe(false);
  });
});
