import { describe, it, expect } from "vitest";
import { delegatedScopesFromToken, scopesFromAccessToken } from "./token-scopes";

describe("scopesFromAccessToken", () => {
  it("reads scp claim from JWT payload", () => {
    const payload = Buffer.from(JSON.stringify({ scp: "User.Read Calendars.Read Mail.Send" })).toString(
      "base64url"
    );
    const token = `header.${payload}.sig`;
    expect(scopesFromAccessToken(token)).toEqual(["User.Read", "Calendars.Read", "Mail.Send"]);
  });

  it("uses MSAL scope list for opaque (non-JWT) access tokens", () => {
    expect(scopesFromAccessToken("EwBIBMl6BAAUCBUz0Pac")).toEqual([]);
    expect(delegatedScopesFromToken("EwBIBMl6BAAUCBUz0Pac", ["User.Read", "Calendars.Read"])).toEqual([
      "User.Read",
      "Calendars.Read",
    ]);
  });
});
