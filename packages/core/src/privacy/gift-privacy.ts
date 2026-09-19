import type { ConstituentProfile, GiftSummary } from "../models/types";

export function profileHasAnonymousGift(profile: ConstituentProfile): boolean {
  return profile.gifts.some((g) => g.anonymous);
}

export function redactGiftAmountForDisplay(
  gift: GiftSummary,
  profile: ConstituentProfile
): { amount: number | null; redacted: boolean } {
  if (gift.anonymous) return { amount: null, redacted: true };
  return { amount: gift.amount, redacted: false };
}

export function safeGiftAmountLabel(profile: ConstituentProfile): string {
  if (profileHasAnonymousGift(profile) && profile.gifts.every((g) => g.anonymous)) {
    return "undisclosed (anonymous giving on record)";
  }
  if (profile.mostRecentGiftAmount === null) return "unknown";
  const recent = profile.gifts[profile.gifts.length - 1];
  if (recent?.anonymous) return "undisclosed (most recent gift anonymous)";
  return `$${profile.mostRecentGiftAmount.toFixed(0)}`;
}
