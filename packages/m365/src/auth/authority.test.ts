import { afterEach, describe, expect, it } from "vitest";
import { authoritySegmentForAccountKind, parseAccountKindParam } from "./authority";

describe("authority", () => {
  const priorTenant = process.env.MICROSOFT_TENANT_ID;

  afterEach(() => {
    if (priorTenant === undefined) delete process.env.MICROSOFT_TENANT_ID;
    else process.env.MICROSOFT_TENANT_ID = priorTenant;
  });

  it("maps personal and work account kinds when tenant is common", () => {
    process.env.MICROSOFT_TENANT_ID = "common";
    expect(authoritySegmentForAccountKind("personal")).toBe("consumers");
    expect(authoritySegmentForAccountKind("work")).toBe("organizations");
  });

  it("uses consumers for personal even when env tenant is a single-tenant GUID", () => {
    process.env.MICROSOFT_TENANT_ID = "9f299fae-0127-41d4-97e8-35b90a528c98";
    expect(authoritySegmentForAccountKind("personal")).toBe("consumers");
    expect(authoritySegmentForAccountKind("work")).toBe("9f299fae-0127-41d4-97e8-35b90a528c98");
    expect(authoritySegmentForAccountKind("default")).toBe("common");
  });

  it("parses accountKind query values", () => {
    expect(parseAccountKindParam("personal")).toBe("personal");
    expect(parseAccountKindParam("work")).toBe("work");
    expect(parseAccountKindParam(null)).toBe("default");
  });
});
