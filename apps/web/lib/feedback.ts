export type FeedbackTag =
  | "good_recommendation"
  | "wrong_action"
  | "already_contacted"
  | "not_appropriate"
  | "strong_prospect"
  | "needs_data_cleanup";

export type FeedbackRecord = {
  constituentId: string;
  tag: FeedbackTag;
  at: string;
};

const STORAGE_KEY = "tuesday-feedback-v1";

export function loadFeedback(): FeedbackRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as FeedbackRecord[];
  } catch {
    return [];
  }
}

export function saveFeedback(record: FeedbackRecord) {
  const all = loadFeedback().filter(
    (r) => !(r.constituentId === record.constituentId && r.tag === record.tag)
  );
  all.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function feedbackCount(): number {
  return loadFeedback().length;
}

export function isConstituentFlagged(constituentId: string, tag: FeedbackTag): boolean {
  return loadFeedback().some((r) => r.constituentId === constituentId && r.tag === tag);
}

/** Session overlay: deprioritize IDs with negative feedback (client-side only demo). */
export function applyFeedbackDeprioritize<T extends { constituentId: string; priorityScore: number }>(
  items: T[]
): T[] {
  const penalized = new Set(
    loadFeedback()
      .filter((r) => r.tag === "wrong_action" || r.tag === "already_contacted" || r.tag === "not_appropriate")
      .map((r) => r.constituentId)
  );
  return [...items]
    .map((i) =>
      penalized.has(i.constituentId) ? { ...i, priorityScore: i.priorityScore * 0.15 } : i
    )
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
