"use client";

import { useEffect, useState } from "react";
import type { ConstituentProfile, RecommendedAction } from "@tuesday/core";
import { QueueAutopilotActions } from "@/components/QueueAutopilotActions";
import type { QueueItem } from "@tuesday/core";

export function ConstituentAutomationPanel({
  profile,
  recommendation,
}: {
  profile: ConstituentProfile;
  recommendation: RecommendedAction | null;
}) {
  const [activity, setActivity] = useState<Array<{ type: string; summary: string; at: string; status: string }>>([]);

  useEffect(() => {
    fetch(`/api/automation/activity/${profile.id}`)
      .then((r) => r.json())
      .then((d) => setActivity(d.activity ?? []));
  }, [profile.id]);

  const queueItem: QueueItem | null = recommendation
    ? {
        constituentId: profile.id,
        constituentName: profile.displayName,
        recommendedAction: recommendation.action,
        channel: recommendation.channel,
        estimatedMinutes: recommendation.estimatedMinutes,
        conservativeOpportunity: recommendation.opportunity.conservative,
        expectedOpportunity: recommendation.opportunity.expected,
        upsideOpportunity: recommendation.opportunity.upside,
        priorityScore: recommendation.priorityScore,
        confidence: recommendation.confidence,
        whyNow: recommendation.whyNow,
        evidence: recommendation.evidence,
        suggestedMessage: recommendation.suggestedMessage,
        warning: recommendation.warning,
      }
    : null;

  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="font-semibold">Automation</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Drafts and sends go through approval. Microsoft 365 optional (mock mode without credentials).
      </p>
      {queueItem && <QueueAutopilotActions item={queueItem} />}
      {activity.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-[var(--muted)]">
          {activity.map((a, i) => (
            <li key={i}>
              {a.at.slice(0, 10)} · {a.type} · {a.summary} ({a.status})
            </li>
          ))}
        </ul>
      )}
      <a href="/autopilot" className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline">
        Open Autopilot inbox →
      </a>
    </section>
  );
}
