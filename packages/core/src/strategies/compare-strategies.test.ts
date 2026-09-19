import { describe, it, expect } from "vitest";
import { compareStrategies } from "./compare-strategies";
import type { ProcessedDataset } from "../models/types";

const miniDataset: ProcessedDataset = {
  meta: {
    schoolName: "Test",
    constituentCount: 2,
    donorCount: 2,
    lybuntCount: 1,
    currentFiscalYear: 2026,
    generatedAt: "",
  },
  campaigns: [],
  profiles: [
    {
      id: "1",
      displayName: "A",
      firstName: "A",
      lastName: "One",
      city: "Boston",
      state: "MA",
      classYear: 2010,
      primaryEmail: "a@test.com",
      emailStatus: "deliverable",
      phoneStatus: "available",
      doNotSolicit: false,
      deceased: false,
      assignedStaffId: null,
      affiliationTypes: ["alumni"],
      activityNames: ["Soccer"],
      dataQualityFlags: [],
      canEmail: true,
      canPhone: true,
      gifts: [
        {
          id: "g1",
          giftDate: "2025-06-01",
          amount: 100,
          fiscalYear: 2025,
          giftType: "one_time",
          status: "paid",
          campaignId: null,
          anonymous: false,
        },
      ],
      paidGiftCount: 1,
      lifetimeGiving: 100,
      averageGift: 100,
      largestGift: 100,
      mostRecentGiftDate: "2025-06-01",
      mostRecentGiftAmount: 100,
      lastGiftFiscalYear: 2025,
      givingYearCount: 1,
      consecutiveGivingYears: 0,
      yearsSinceLastGift: 1,
      currentFiscalYearGiving: 0,
      gaveCurrentYear: false,
      gavePriorYear: true,
      amountTrend: 0,
      eventCount: 1,
      events: [
        {
          eventId: "e1",
          eventName: "Alumni Event",
          attendedAt: "2025-01-01",
          startsAt: "2025-01-01",
          city: "Boston",
        },
      ],
      daysSinceLastInteraction: 100,
      lastInteractionType: "email",
      hasRecurringGift: false,
      staleAskAmount: null,
      recentCareerUpdate: false,
      labels: ["lybunt", "renewal_candidate"],
      scores: {
        renewal: 0.9,
        upgrade: 0.2,
        recurring: 0.1,
        reactivation: 0.1,
        eventAffinity: 0.5,
        stewardshipUrgency: 0.2,
        dataQuality: 0,
      },
      confidence: 0.8,
    },
  ],
};

describe("compareStrategies", () => {
  it("returns a plan per strategy preset", () => {
    const result = compareStrategies(miniDataset, {
      staffHours: 4,
      channels: ["phone", "email"],
      strategyIds: ["protect_donor_retention", "maximize_immediate_dollars"],
    });
    expect(result.plans).toHaveLength(2);
    expect(result.frontier).toHaveLength(2);
  });
});
