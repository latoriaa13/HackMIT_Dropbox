import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { M365AuthError } from "../auth/errors";
import { Microsoft365PermissionError, m365ErrorToHttpResponse } from "../http/api-errors";

describe("m365ErrorToHttpResponse", () => {
  it("maps insufficient scope to MICROSOFT365_PERMISSION_ERROR", () => {
    const err = new M365AuthError("Need calendar", "insufficient_scope", ["Calendars.ReadWrite"]);
    const http = m365ErrorToHttpResponse(err);
    expect(http.status).toBe(403);
    expect(http.body.code).toBe("MICROSOFT365_PERMISSION_ERROR");
    expect(http.body.requiredScopes).toEqual(["Calendars.ReadWrite"]);
  });

  it("permission error includes required scopes", () => {
    const http = m365ErrorToHttpResponse(
      new Microsoft365PermissionError("Mail required", ["Mail.Send"])
    );
    expect(http.body.requiredScopes).toEqual(["Mail.Send"]);
  });
});
