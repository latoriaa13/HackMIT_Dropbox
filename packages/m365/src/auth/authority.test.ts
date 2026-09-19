import { describe, expect, it } from "vitest";
import { authoritySegmentForAccountKind, parseAccountKindParam } from "./authority";

describe("authority", () => {
  it("maps personal and work account kinds", () => {
    expect(authoritySegmentForAccountKind("personal")).toBe("consumers");
    expect(authoritySegmentForAccountKind("work")).toBe("organizations");
  });

  it("parses accountKind query values", () => {
    expect(parseAccountKindParam("personal")).toBe("personal");
    expect(parseAccountKindParam("work")).toBe("work");
    expect(parseAccountKindParam(null)).toBe("default");
  });
});
