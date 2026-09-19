import type { ConstituentProfile } from "../models/types";

export type JourneyStep = {
  dayOffset: number;
  action: string;
  channel: string;
  rationale: string;
  doNotDoYet?: string;
};

export function planDonorJourney(profile: ConstituentProfile): JourneyStep[] {
  const steps: JourneyStep[] = [];

  if (profile.deceased || profile.doNotSolicit) {
    return [
      {
        dayOffset: 0,
        action: "No outreach",
        channel: "none",
        rationale: profile.deceased ? "Constituent is deceased." : "Do-not-solicit flag on record.",
        doNotDoYet: "Do not schedule solicitation actions.",
      },
    ];
  }

  if (profile.labels.includes("never_donor")) {
    if (profile.eventCount > 0) {
      steps.push(
        { dayOffset: 0, action: "Stewardship message", channel: "email", rationale: "Thank for event participation." },
        { dayOffset: 30, action: "Event invitation", channel: "event_invitation", rationale: "Build on event affinity before first ask." },
        { dayOffset: 60, action: "Soft first-gift conversation", channel: "phone", rationale: "Only after engagement signals.", doNotDoYet: "No ask before day 60 without gift history." }
      );
    } else {
      steps.push(
        { dayOffset: 0, action: "Data-quality follow-up", channel: "email", rationale: "Confirm contact before cultivation." },
        { dayOffset: 45, action: "Impact story", channel: "email", rationale: "Introduce mission before solicitation." }
      );
    }
    return steps;
  }

  if (profile.labels.includes("first_time_donor") || (profile.gaveCurrentYear && profile.paidGiftCount <= 2)) {
    steps.push(
      { dayOffset: 0, action: "Thank-you message", channel: "stewardship_message", rationale: "Recent first or early gift — gratitude first." },
      { dayOffset: 14, action: "Impact update", channel: "email", rationale: "Show outcome of their gift." },
      { dayOffset: 45, action: "Second-gift conversation", channel: "phone", rationale: "Invite modest second gift.", doNotDoYet: "No upgrade ask yet." }
    );
    return steps;
  }

  if (profile.labels.includes("lybunt")) {
    steps.push(
      { dayOffset: 0, action: "Personal renewal call", channel: "phone", rationale: "Gave last FY, not this FY — renewal risk." },
      { dayOffset: 21, action: "Follow-up email", channel: "email", rationale: "Reinforce renewal if no response." }
    );
    return steps;
  }

  if (profile.labels.includes("sybunt") || profile.labels.includes("long_lapsed")) {
    steps.push(
      { dayOffset: 0, action: "Reactivation email", channel: "email", rationale: "Acknowledge lapse; reference last gift era." },
      { dayOffset: 30, action: "Personal call", channel: "phone", rationale: "Human touch for lapsed loyal donors." },
      { dayOffset: 60, action: "Event invitation", channel: "event_invitation", rationale: "Re-engage through campus connection if events on record." }
    );
    return steps;
  }

  if (profile.gaveCurrentYear && profile.labels.includes("upgrade_candidate")) {
    steps.push(
      { dayOffset: 0, action: "Thank-you / stewardship", channel: "stewardship_message", rationale: "Already gave this FY — thank before next ask." },
      { dayOffset: 60, action: "Upgrade conversation", channel: "phone", rationale: "Trend and consecutive years support upgrade.", doNotDoYet: "Skip upgrade if engagement drops." },
      { dayOffset: 90, action: "Recurring-gift invitation", channel: "email", rationale: "Offer recurring after upgrade discussion." }
    );
    return steps;
  }

  if (profile.hasRecurringGift) {
    steps.push(
      { dayOffset: 0, action: "Stewardship message", channel: "email", rationale: "Affirm recurring commitment." },
      { dayOffset: 90, action: "Impact report", channel: "email", rationale: "Retention-focused touch." }
    );
    return steps;
  }

  if (profile.gaveCurrentYear) {
    steps.push(
      { dayOffset: 0, action: "Thank-you message", channel: "stewardship_message", rationale: "Current-year donor — stewardship priority." },
      { dayOffset: 30, action: "Event invitation", channel: "event_invitation", rationale: "Deepen engagement.", doNotDoYet: "No renewal ask — already gave this FY." }
    );
    return steps;
  }

  steps.push(
    { dayOffset: 0, action: "Renewal outreach", channel: "phone", rationale: "Default renewal path for prior donors." },
    { dayOffset: 30, action: "Stewardship check-in", channel: "email", rationale: "Maintain relationship between asks." }
  );
  return steps;
}
