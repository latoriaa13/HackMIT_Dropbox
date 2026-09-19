import { describe, it, expect } from "vitest";
import { optimizeQueue, toQueueItem } from "./weekly-queue";
import type { CandidateItem, ConstituentProfile, RecommendedAction } from "../models/types";

function mockProfile(id: string): ConstituentProfile {
  return {
    id,
    displayName: `Person ${id}`,
    firstName: "P",
    lastName: id,
    city: null,
    state: null,
    classYear: null,
    primaryEmail: "a@b.com",
    emailStatus: "deliverable",
    phoneStatus: "available",
    doNotSolicit: false,
    deceased: false,
    assignedStaffId: null,
    affiliationTypes: [],
    activityNames: [],
    dataQualityFlags: [],
    canEmail: true,
    canPhone: true,
    gifts: [],
    paidGiftCount: 1,
    lifetimeGiving: 100,
    averageGift: 100,
    largestGift: 100,
    mostRecentGiftDate: "2025-01-01",
    mostRecentGiftAmount: 100,
    lastGiftFiscalYear: 2025,
    givingYearCount: 1,
    consecutiveGivingYears: 0,
    yearsSinceLastGift: 1,
    currentFiscalYearGiving: 0,
    gaveCurrentYear: false,
    gavePriorYear: true,
    amountTrend: 0,
    eventCount: 0,
    events: [],
    daysSinceLastInteraction: null,
    lastInteractionType: null,
    hasRecurringGift: false,
    staleAskAmount: null,
    recentCareerUpdate: false,
    labels: ["lybunt"],
    scores: {
      renewal: 0.9,
      upgrade: 0,
      recurring: 0,
      reactivation: 0,
      eventAffinity: 0,
      stewardshipUrgency: 0,
      dataQuality: 0,
    },
    confidence: 0.8,
  };
}

function mockRec(priority: number, minutes: number): RecommendedAction {
  return {
    action: "renewal_ask",
    channel: "phone",
    estimatedMinutes: minutes,
    opportunity: { conservative: 100, expected: 100, upside: 120 },
    confidence: 0.8,
    relationshipFit: 1,
    urgency: 1,
    priorityScore: priority,
    whyNow: "test",
    evidence: [],
    suggestedMessage: "test",
    warning: null,
    ineligibleReasons: {} as RecommendedAction["ineligibleReasons"],
  };
}

describe("optimizeQueue", () => {
  it("respects minute budget and one row per constituent", () => {
    const candidates: CandidateItem[] = [
      { profile: mockProfile("1"), recommendation: mockRec(10, 30) },
      { profile: mockProfile("2"), recommendation: mockRec(9, 30) },
      { profile: mockProfile("1"), recommendation: mockRec(100, 5) },
    ];
    const { items, minutesUsed } = optimizeQueue(candidates, {
      objective: "protect_renewals",
      staffHours: 1,
      channels: ["phone"],
      riskPreference: "balanced",
    });
    expect(items).toHaveLength(2);
    expect(minutesUsed).toBeLessThanOrEqual(60);
    expect(new Set(items.map((i) => i.constituentId)).size).toBe(items.length);
  });
});

describe("toQueueItem", () => {
  it("maps fields", () => {
    const item = toQueueItem(mockProfile("9"), mockRec(1, 20));
    expect(item.constituentName).toBe("Person 9");
    expect(item.estimatedMinutes).toBe(20);
  });
});
