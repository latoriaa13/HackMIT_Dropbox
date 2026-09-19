import { describe, it, expect } from "vitest";
import { deriveLabels } from "./derive-labels";

const config = { currentFiscalYear: 2026, fiscalYearStartMonth: 7, referenceDate: "2026-09-01" };

describe("deriveLabels", () => {
  it("marks LYBUNT when gave prior year not current", () => {
    const labels = deriveLabels(
      {
        paidGiftCount: 3,
        givingYearCount: 2,
        gaveCurrentYear: false,
        gavePriorYear: true,
        yearsSinceLastGift: 1,
        lifetimeGiving: 500,
        hasRecurringGift: false,
        averageGift: 100,
        eventCount: 0,
        dataQualityFlags: [],
        canEmail: true,
        canPhone: true,
        deceased: false,
        doNotSolicit: false,
      },
      [2024, 2025],
      config
    );
    expect(labels).toContain("lybunt");
    expect(labels).toContain("renewal_candidate");
  });

  it("marks never_donor", () => {
    const labels = deriveLabels(
      {
        paidGiftCount: 0,
        givingYearCount: 0,
        gaveCurrentYear: false,
        gavePriorYear: false,
        yearsSinceLastGift: null,
        lifetimeGiving: 0,
        hasRecurringGift: false,
        averageGift: 0,
        eventCount: 0,
        dataQualityFlags: [],
        canEmail: false,
        canPhone: false,
        deceased: false,
        doNotSolicit: false,
      },
      [],
      config
    );
    expect(labels).toEqual(["never_donor"]);
  });
});
