import Link from "next/link";
import type { QueueItem } from "@tuesday/core";
import { formatAction, formatCurrency, confidenceLabel } from "@/lib/format";
import { saveFeedback, type FeedbackTag } from "@/lib/feedback";
import { QueueAutopilotActions } from "@/components/QueueAutopilotActions";

export function QueueCard({ item, rank }: { item: QueueItem; rank: number }) {
  const sendFeedback = (tag: FeedbackTag) => {
    saveFeedback({ constituentId: item.constituentId, tag, at: new Date().toISOString() });
  };
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            #{rank} · {item.estimatedMinutes} min · {item.channel}
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            <Link
              href={`/constituents/${item.constituentId}`}
              className="hover:text-[var(--accent)] hover:underline"
            >
              {item.constituentName}
            </Link>
          </h3>
          <p className="mt-1 text-[var(--accent)] font-medium">
            {formatAction(item.recommendedAction)}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{formatCurrency(item.expectedOpportunity)}</p>
          <p className="text-[var(--muted)]">
            {formatCurrency(item.conservativeOpportunity)} –{" "}
            {formatCurrency(item.upsideOpportunity)}
          </p>
          <p className="mt-1 text-xs">
            Priority {item.priorityScore.toFixed(1)} · {confidenceLabel(item.confidence)}{" "}
            confidence
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed">
        <span className="font-medium">Why now?</span> {item.whyNow}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.evidence.slice(0, 5).map((e) => (
          <span
            key={e}
            className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs text-[var(--ink)]"
          >
            {e}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">{item.suggestedMessage}</p>
      {item.warning && (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {item.warning}
        </p>
      )}
      <QueueAutopilotActions item={item} />
      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["good_recommendation", "Good"],
            ["wrong_action", "Wrong action"],
            ["already_contacted", "Contacted"],
            ["strong_prospect", "Strong prospect"],
          ] as const
        ).map(([tag, label]) => (
          <button
            key={tag}
            type="button"
            className="rounded-full border border-stone-200 px-2 py-0.5 text-xs hover:bg-stone-100"
            onClick={() => sendFeedback(tag)}
          >
            {label}
          </button>
        ))}
      </div>
    </article>
  );
}
