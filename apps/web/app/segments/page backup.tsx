"use client";

import { useState } from "react";
import Link from "next/link";
import type { SegmentQueryResult } from "@tuesday/core";
import { formatCurrency } from "@/lib/format";

const EXAMPLES = [
  "Who are the 20 people I should reach before Giving Day?",
  "Find loyal donors who have not given this year",
  "Which young alumni in Chicago attended an event but have never donated?",
  "Find donors who have been asked for the same amount for several years",
  "What groups have something meaningful in common?",
  "Which constituents should receive a recurring-gift ask?",
];

export default function SegmentsPage() {
  const [query, setQuery] = useState(EXAMPLES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SegmentQueryResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/segments/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 20 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Query failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Segment discovery</h1>
      <p className="max-w-2xl text-sm text-[var(--muted)]">
        Ask questions in plain language. Answers use only fields in your constituent database — unavailable
        signals are called out explicitly.
      </p>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <textarea
          className="min-h-[100px] w-full rounded-lg border border-[var(--border)] p-3 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs hover:bg-[var(--accent-soft)]"
              onClick={() => setQuery(ex)}
            >
              {ex.length > 48 ? `${ex.slice(0, 48)}…` : ex}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="mt-4 rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Searching…" : "Run segment query"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">{error}</p>
      )}

      {result && (
        <section className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="text-lg font-semibold">{result.segmentName}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{result.description}</p>
            <p className="mt-2 text-sm">
              <span className="font-medium">{result.count.toLocaleString()}</span> matching · Recommended:{" "}
              {result.recommendedCampaign}
            </p>
            <p className="mt-2 text-sm">
              Opportunity (planning): {formatCurrency(result.opportunity.conservative)} –{" "}
              {formatCurrency(result.opportunity.upside)} (expected{" "}
              {formatCurrency(result.opportunity.expected)})
            </p>
            {result.sharedCharacteristics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.sharedCharacteristics.map((c) => (
                  <span key={c} className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {result.unsupportedSignals.map((u) => (
              <p key={u} className="mt-2 text-sm text-amber-800">
                {u}
              </p>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-stone-50 text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Lifetime</th>
                </tr>
              </thead>
              <tbody>
                {result.constituents.map((c) => (
                  <tr key={c.id} className="border-b border-stone-100">
                    <td className="px-4 py-2">
                      <Link href={`/constituents/${c.id}`} className="text-[var(--accent)] hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{c.classYear ?? "—"}</td>
                    <td className="px-4 py-2">{c.city ?? "—"}</td>
                    <td className="px-4 py-2">{formatCurrency(c.lifetimeGiving)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
