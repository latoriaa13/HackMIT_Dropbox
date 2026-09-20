"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Community } from "@tuesday/core";
import type { CampaignPlan } from "@tuesday/core";
import { formatCurrency } from "@/lib/format";

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Community | null>(null);
  const [campaign, setCampaign] = useState<CampaignPlan | null>(null);
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    fetch("/api/communities")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setCommunities(d.communities ?? []);
      });
  }, []);

  const buildCampaign = async (c: Community) => {
    setBuilding(true);
    setCampaign(null);
    try {
      const res = await fetch("/api/campaign/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId: c.id, staffHours: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCampaign(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Campaign failed");
    } finally {
      setBuilding(false);
    }
  };

  const exportCampaign = () => {
    if (!campaign) return;
    const header = "constituent_id,name,action,channel,minutes";
    const lines = campaign.taskList.map((t) =>
      [t.constituentId, t.name, t.action, t.channel, t.minutes].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaign-tasks.csv";
    a.click();
  };

  if (error) return <p className="text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Communities & connectors</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Relationship groups from observable shared activities, class years, cities, and events.
          Connectors are labeled <strong>potential connectors</strong> when engagement evidence supports outreach.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {communities.slice(0, 12).map((c) => (
          <article
            key={c.id}
            className={`cursor-pointer rounded-xl border p-4 ${selected?.id === c.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "bg-white"}`}
            onClick={() => setSelected(c)}
          >
            <h2 className="font-semibold">{c.name}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">{c.sharedCharacteristics.join(" · ")}</p>
            <p className="mt-2 text-sm">
              {c.memberCount} constituents · {formatCurrency(c.totalHistoricalGiving)} historical ·{" "}
              {c.lapsedDonorCount} lapsed
            </p>
            <p className="mt-1 text-sm text-[var(--accent)]">{c.recommendedAction}</p>
          </article>
        ))}
      </div>

      {selected && (
        <section className="space-y-4 rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold">{selected.name}</h2>
          <p className="text-sm">
            Recommended campaign: <strong>{selected.recommendedCampaign}</strong>
          </p>
          <p className="text-sm text-[var(--muted)]">
            Planning opportunity: {formatCurrency(selected.opportunity.conservative)} –{" "}
            {formatCurrency(selected.opportunity.upside)} (expected{" "}
            {formatCurrency(selected.opportunity.expected)})
          </p>

          <div>
            <h3 className="text-sm font-semibold">Potential connectors</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {selected.potentialConnectors.map((pc) => (
                <li key={pc.constituentId} className="rounded-lg border p-3">
                  <Link href={`/constituents/${pc.constituentId}`} className="font-medium text-[var(--accent)]">
                    {pc.name}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">{pc.reasons.join("; ")}</p>
                </li>
              ))}
              {selected.potentialConnectors.length === 0 && (
                <p className="text-[var(--muted)]">No connectors met evidence threshold in this slice.</p>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Sample relationship edges</h3>
            <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-[var(--muted)]">
              {selected.sampleEdges.slice(0, 8).map((e, i) => (
                <li key={i}>
                  {e.sourceId} ↔ {e.targetId}: {e.reason}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            disabled={building}
            onClick={() => buildCampaign(selected)}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {building ? "Building campaign…" : "Generate campaign plan"}
          </button>
        </section>
      )}

      {campaign && (
        <section className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-5 space-y-3">
          <h2 className="text-lg font-semibold">Campaign: {campaign.campaignName}</h2>
          <p className="text-sm">{campaign.messageAngle}</p>
          <p className="text-sm">
            {campaign.taskList.length} staff tasks · Expected planning opp.{" "}
            {formatCurrency(campaign.opportunity.expected)}
          </p>
          {campaign.recommendedConnectors.length > 0 && (
            <p className="text-sm">
              Engage connectors:{" "}
              {campaign.recommendedConnectors.map((c) => c.name).join(", ")}
            </p>
          )}
          <button type="button" onClick={exportCampaign} className="rounded border bg-white px-4 py-2 text-sm">
            Export campaign CSV
          </button>
        </section>
      )}
    </div>
  );
}
