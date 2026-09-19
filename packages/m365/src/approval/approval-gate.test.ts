import { describe, it, expect } from "vitest";
import { requiresApproval } from "./policies";
import { checkEmailOutreachEligible } from "../drafts/grounded-email";
import type { ConstituentProfile } from "@tuesday/core";

describe("approval policies", () => {
  it("requires approval for send actions", () => {
    expect(requiresApproval("mail.send")).toBe(true);
    expect(requiresApproval("calendar.create_event_draft")).toBe(false);
  });
});

describe("email eligibility", () => {
  it("blocks deceased and do_not_solicit", () => {
    const p = { deceased: true, doNotSolicit: false, canEmail: true, primaryEmail: "a@b.com", emailStatus: "deliverable" } as ConstituentProfile;
    expect(checkEmailOutreachEligible(p).ok).toBe(false);
  });
});
