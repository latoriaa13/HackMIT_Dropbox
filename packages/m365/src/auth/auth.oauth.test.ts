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
  hasMicrosoftConnection,
  isMicrosoft365Connected,
  requireMicrosoft365Provider,
  saveMicrosoftAccount,
  requiresApproval,
  Microsoft365ConfigurationError,
  Microsoft365NotConnectedError,
  m365ErrorToHttpResponse,
} from "../index";
import { readMsalCacheSerialized, writeMsalCacheSerialized } from "./msal-cache-store";

const tmpDir = path.join(os.tmpdir(), `tuesday-m365-auth-${process.pid}`);

describe("Microsoft OAuth session (no mock provider)", () => {
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

  it("missing configuration returns MICROSOFT365_CONFIGURATION_ERROR", () => {
    expect(() => requireMicrosoft365Provider("user-a")).toThrow(Microsoft365ConfigurationError);
    const session = getPublicM365Session("user-a");
    expect(session.configurationError).toBe(true);
    expect(session.connected).toBe(false);
    const http = m365ErrorToHttpResponse(new Microsoft365ConfigurationError());
    expect(http.status).toBe(503);
    expect(http.body.code).toBe("MICROSOFT365_CONFIGURATION_ERROR");
  });

  it("missing session returns MICROSOFT365_NOT_CONNECTED", () => {
    process.env.MICROSOFT_CLIENT_ID = "test-client";
    process.env.MICROSOFT_CLIENT_SECRET = "test-secret";
    expect(() => requireMicrosoft365Provider("user-b")).toThrow(Microsoft365NotConnectedError);
    expect(isMicrosoft365Connected("user-b")).toBe(false);
    const http = m365ErrorToHttpResponse(new Microsoft365NotConnectedError());
    expect(http.status).toBe(401);
    expect(http.body.code).toBe("MICROSOFT365_NOT_CONNECTED");
    expect(http.body.connectUrl).toBe("/api/auth/microsoft/connect");
  });

  it("authenticated sessions select MicrosoftGraphProvider", () => {
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
    const provider = requireMicrosoft365Provider("user-c");
    expect(provider.constructor.name).toBe("MicrosoftGraphProvider");
    expect(isMicrosoft365Connected("user-c")).toBe(true);
  });

  it("rejects invalid OAuth state", () => {
    expect(consumeOAuthState("not-a-real-state")).toBeNull();
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
    expect(() => requireMicrosoft365Provider("user-e")).toThrow(Microsoft365NotConnectedError);
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
