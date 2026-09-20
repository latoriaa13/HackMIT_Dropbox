"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ConstituentProfile,
  RecommendedAction,
  TimelineEvent,
  DetailedExplanation,
} from "@tuesday/core";
import type { JourneyStep } from "@tuesday/core";
import { formatAction, formatCurrency, confidenceLabel } from "@/lib/format";
import { ConstituentAutomationPanel } from "@/components/ConstituentAutomationPanel";

export default function ConstituentDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [profile, setProfile] = useState<ConstituentProfile | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendedAction | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<DetailedExplanation | null>(null);
  const [journey, setJourney] = useState<JourneyStep[]>([]);

  useEffect(() => {
    fetch(`/api/constituents/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setProfile(d.profile);
          setRecommendation(d.recommendation);
          setTimeline(d.timeline);
          setExplanation(d.explanation);
          setJourney(d.journey ?? []);
        }
      });
  }, [id]);

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">{error}</p>
    );
  }

  if (!profile) return <p className="text-sm text-[var(--muted)]">Loading constituent…</p>;

  const chartData = profile.gifts
    .filter((g) => !g.anonymous)
    .map((g) => ({
      year: g.giftDate.slice(0, 4),
      amount: g.amount,
    }));

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
        ← Back to weekly plan
      </Link>
      <header>
        <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
        <p className="text-sm text-[var(--muted)]">
          {profile.city && profile.state ? `${profile.city}, ${profile.state}` : "Location unknown"}
          {profile.classYear ? ` · Class of ${profile.classYear}` : ""}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniStat label="Lifetime giving" value={formatCurrency(profile.lifetimeGiving)} />
        <MiniStat label="Paid gifts" value={String(profile.paidGiftCount)} />
        <MiniStat
          label="Consecutive FYs"
          value={String(profile.consecutiveGivingYears)}
        />
      </div>

      {explanation && (
        <section className="rounded-xl border bg-white p-5 text-sm space-y-2">
          <h2 className="font-semibold">Explanation</h2>
          <p>
            <strong>Why this person?</strong> {explanation.whyThisPerson.join("; ") || "See evidence below."}
          </p>
          <p>
            <strong>Why this action?</strong> {explanation.whyThisAction}
          </p>
          <p>
            <strong>Why now?</strong> {explanation.whyNow}
          </p>
          {explanation.whyNotAlternatives.map((w) => (
            <p key={w} className="text-[var(--muted)]">
              {w}
            </p>
          ))}
          {explanation.missingEvidence.length > 0 && (
            <p className="text-amber-800">
              Missing evidence: {explanation.missingEvidence.join("; ")}
            </p>
          )}
          <p>{explanation.confidenceReason}</p>
        </section>
      )}

      {journey.length > 0 && (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Recommended relationship journey</h2>
          <ol className="mt-3 space-y-3 text-sm">
            {journey.map((step) => (
              <li key={step.dayOffset} className="border-l-2 border-[var(--accent)] pl-3">
                <p className="font-medium">
                  Day {step.dayOffset} — {step.action} ({step.channel})
                </p>
                <p className="text-[var(--muted)]">{step.rationale}</p>
                {step.doNotDoYet && (
                  <p className="text-amber-800 text-xs mt-1">{step.doNotDoYet}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {recommendation && (
        <ConstituentAutomationPanel profile={profile} recommendation={recommendation} />
      )}

      {recommendation && (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] p-5">
          <h2 className="font-semibold">Recommended next action</h2>
          <p className="mt-1 text-lg text-[var(--accent)]">
            {formatAction(recommendation.action)}
          </p>
          <p className="mt-3 text-sm">
            We recommend <strong>{formatAction(recommendation.action)}</strong> because{" "}
            {recommendation.evidence.slice(0, 2).join("; ") || "constituent history supports this step"}.
            This is timely because {recommendation.whyNow.toLowerCase()}. Confidence is{" "}
            <strong>{confidenceLabel(recommendation.confidence)}</strong> based on contact and giving
            data quality.
          </p>
        </section>
      )}

      <section className="rounded-xl border border-[var(--border)] bg-white p-5">
        <h2 className="font-semibold">Giving timeline</h2>
        <div className="mt-4 h-48">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#b45309" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--muted)]">No paid gifts on record.</p>
          )}
        </div>
        <ol className="mt-4 space-y-2 border-t pt-4 text-sm">
          {timeline.slice(-8).map((t, i) => (
            <li key={`${t.date}-${i}`} className="flex justify-between gap-4">
              <span>
                <span className="font-medium">{t.label}</span> — {t.detail}
              </span>
              <span className="shrink-0 text-[var(--muted)]">{t.date.slice(0, 10)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 text-sm">
          <h2 className="font-semibold">Affiliations & activities</h2>
          <p className="mt-2">{profile.affiliationTypes.join(", ") || "None listed"}</p>
          <p className="mt-2 text-[var(--muted)]">
            {profile.activityNames.slice(0, 6).join(" · ") || "No activities"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 text-sm">
          <h2 className="font-semibold">Contact & data quality</h2>
          <p className="mt-2">Email: {profile.emailStatus}</p>
          <p>Phone: {profile.phoneStatus}</p>
          {profile.dataQualityFlags.length > 0 && (
            <p className="mt-2 text-amber-800">{profile.dataQualityFlags.join(", ")}</p>
          )}
        </div>
      </section>

      {recommendation && (
        <section className="rounded-xl border border-[var(--border)] bg-white p-5 text-sm">
          <h2 className="font-semibold">Score components (transparent)</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
            {Object.entries(profile.scores).map(([k, v]) => (
              <li key={k}>
                {k}: {(v as number).toFixed(2)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <p className="text-xs uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
