import { describe, it, expect } from "vitest";
import { scopesFromAccessToken } from "./token-scopes";

describe("scopesFromAccessToken", () => {
  it("reads scp claim from JWT payload", () => {
    const payload = Buffer.from(JSON.stringify({ scp: "User.Read Calendars.Read Mail.Send" })).toString(
      "base64url"
    );
    const token = `header.${payload}.sig`;
    expect(scopesFromAccessToken(token)).toEqual(["User.Read", "Calendars.Read", "Mail.Send"]);
  });
});
