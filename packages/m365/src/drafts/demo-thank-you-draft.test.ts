import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendAudit } from "../storage/audit-log";
import { ensureDemoThankYouEmailDraft, demoThankYouRecipient } from "./demo-thank-you-draft";
import { listPendingDrafts, removeEmailDraftsToRecipient } from "../storage/draft-store";

const tmpDir = path.join(os.tmpdir(), `tuesday-m365-drafts-${process.pid}`);

describe("ensureDemoThankYouEmailDraft", () => {
  beforeEach(() => {
    process.env.TUESDAY_DATA_DIR = path.join(tmpDir, String(Date.now()));
    fs.mkdirSync(process.env.TUESDAY_DATA_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates one thank-you draft per user", () => {
    ensureDemoThankYouEmailDraft("user-a");
    ensureDemoThankYouEmailDraft("user-a");
    const pending = listPendingDrafts("user-a");
    expect(pending.emails).toHaveLength(1);
    expect(pending.emails[0].to).toContain(demoThankYouRecipient());
    expect(pending.emails[0].subject).toMatch(/Thank you/i);
  });

  it("recreates after send when inbox draft was removed", () => {
    const to = demoThankYouRecipient();
    ensureDemoThankYouEmailDraft("user-b");
    removeEmailDraftsToRecipient("user-b", to);
    appendAudit({
      userId: "user-b",
      actionType: "mail.send_draft",
      target: to,
      status: "executed",
      payloadSummary: "Thank you",
      executedAt: new Date().toISOString(),
    });
    ensureDemoThankYouEmailDraft("user-b");
    expect(listPendingDrafts("user-b").emails).toHaveLength(1);
    expect(listPendingDrafts("user-b").emails[0].to).toContain(to);
  });
});
