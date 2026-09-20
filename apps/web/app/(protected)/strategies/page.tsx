"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Channel, RiskPreference, StrategyComparisonResult, StrategyPlanSummary } from "@tuesday/core";
import { formatCurrency } from "@/lib/format";

export default function StrategiesPage() {
  const [staffHours, setStaffHours] = useState(8);
  const [riskPreference, setRiskPreference] = useState<RiskPreference>("balanced");
  const [channels] = useState<Channel[]>([
    "phone",
    "email",
    "event_invitation",
    "stewardship_message",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<StrategyComparisonResult | null>(null);
  const [selected, setSelected] = useState<StrategyPlanSummary | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/strategies/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffHours,
          channels,
          riskPreference,
          strategyIds: compareIds.length ? compareIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setComparison(data);
      setSelected(data.plans[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [staffHours, channels, riskPreference, compareIds]);

  useEffect(() => {
    load();
  }, [load]);

  const exportStrategy = async (strategyId: string) => {
    const res = await fetch("/api/strategies/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategyId, staffHours, channels, riskPreference }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `strategy-${strategyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-3)
    );
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Strategy simulator</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Compare fundraising strategies under the same staff-time budget. Values are{" "}
          <strong>planning opportunity estimates</strong>, not causal incremental revenue.
        </p>
      </header>

      <div className="flex flex-wrap gap-4 rounded-xl border border-[var(--border)] bg-white p-4">
        <label className="text-sm">
          Staff hours
          <select
            className="ml-2 rounded border px-2 py-1"
            value={staffHours}
            onChange={(e) => setStaffHours(Number(e.target.value))}
          >
            {[4, 8, 16].map((h) => (
              <option key={h} value={h}>
                {h}h
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Risk
          <select
            className="ml-2 rounded border px-2 py-1"
            value={riskPreference}
            onChange={(e) => setRiskPreference(e.target.value as RiskPreference)}
          >
            <option value="revenue_focused">Revenue-focused</option>
            <option value="balanced">Balanced</option>
            <option value="relationship_focused">Relationship-focused</option>
          </select>
        </label>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          {loading ? "Simulating…" : "Compare strategies"}
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {comparison && (
        <>
          {comparison.pairwiseInsights.length > 0 && (
            <div className="rounded-xl bg-[var(--accent-soft)] p-4 text-sm">
              {comparison.pairwiseInsights.map((i) => (
                <p key={i}>{i}</p>
              ))}
            </div>
          )}

          <div className="h-72 rounded-xl border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold">Strategy frontier (planning tradeoffs)</h2>
            <ResponsiveContainer width="100%" height="90%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="expectedOpportunity"
                  name="Expected opportunity"
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="number"
                  dataKey="retentionProtectionScore"
                  name="Retention protection"
                  domain={[0, 1]}
                />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === "Expected opportunity" ? formatCurrency(v) : v.toFixed(2)
                  }
                  labelFormatter={(_, p) => p?.[0]?.payload?.label ?? ""}
                />
                <Scatter
                  data={comparison.frontier.map((f) => ({
                    ...f,
                    retentionProtectionScore: f.retentionProtectionScore,
                  }))}
                  fill="#b45309"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2">Compare</th>
                  <th className="px-3 py-2">Strategy</th>
                  <th className="px-3 py-2">Expected opp.</th>
                  <th className="px-3 py-2">Retention</th>
                  <th className="px-3 py-2">Hours</th>
                  <th className="px-3 py-2">Actions</th>
                  <th className="px-3 py-2">Stewardship</th>
                  <th className="px-3 py-2">Solicitations</th>
                </tr>
              </thead>
              <tbody>
                {comparison.plans.map((p) => (
                  <tr
                    key={p.strategyId}
                    className={`border-t cursor-pointer hover:bg-stone-50 ${selected?.strategyId === p.strategyId ? "bg-[var(--accent-soft)]" : ""}`}
                    onClick={() => setSelected(p)}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={compareIds.includes(p.strategyId)}
                        onChange={() => toggleCompare(p.strategyId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{p.label}</td>
                    <td className="px-3 py-2">{formatCurrency(p.totals.expected)}</td>
                    <td className="px-3 py-2">{(p.retentionProtectionScore * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2">{(p.minutesUsed / 60).toFixed(1)}</td>
                    <td className="px-3 py-2">{p.actionCount}</td>
                    <td className="px-3 py-2">{p.stewardshipActions}</td>
                    <td className="px-3 py-2">{p.solicitationActions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <section className="space-y-4 rounded-xl border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{selected.label}</h2>
                  <p className="text-sm text-[var(--muted)]">{selected.description}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border px-4 py-2 text-sm"
                  onClick={() => exportStrategy(selected.strategyId)}
                >
                  Export strategy CSV
                </button>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Why this strategy?</h3>
                <ul className="mt-1 list-inside list-disc text-sm text-[var(--muted)]">
                  {selected.whyStrategy.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <Stat label="Conservative" value={formatCurrency(selected.totals.conservative)} />
                <Stat label="Expected" value={formatCurrency(selected.totals.expected)} />
                <Stat label="Upside" value={formatCurrency(selected.totals.upside)} />
                <Stat label="High confidence" value={`${(selected.highConfidencePct * 100).toFixed(0)}%`} />
              </div>
              <p className="text-sm">
                Renewal-risk touches: {selected.renewalRiskAddressed} · Relationship warnings:{" "}
                {selected.relationshipRiskWarnings}
              </p>
              <div className="max-h-64 overflow-y-auto text-sm">
                {selected.items.slice(0, 15).map((i) => (
                  <div key={i.constituentId} className="border-t py-2 flex justify-between gap-2">
                    <Link href={`/constituents/${i.constituentId}`} className="text-[var(--accent)] hover:underline">
                      {i.constituentName}
                    </Link>
                    <span className="text-[var(--muted)]">{i.recommendedAction}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
