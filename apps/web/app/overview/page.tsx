"use client";

import { useEffect, useState } from "react";
type Meta = {
  schoolName: string;
  constituentCount: number;
  donorCount: number;
  lybuntCount: number;
  currentFiscalYear: number;
};

export default function OverviewPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setMeta(d.meta);
      });
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">{error}</p>
    );
  }

  if (!meta) return <p className="text-sm text-[var(--muted)]">Loading overview…</p>;

  const nonDonor = meta.constituentCount - meta.donorCount;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Constituent overview</h1>
      <p className="text-[var(--muted)]">{meta.schoolName} · FY{meta.currentFiscalYear} planning</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Constituents" value={meta.constituentCount.toLocaleString()} />
        <Tile label="Ever donors" value={meta.donorCount.toLocaleString()} />
        <Tile label="Non-donors" value={nonDonor.toLocaleString()} />
        <Tile label="LYBUNT" value={meta.lybuntCount.toLocaleString()} hint="Gave last FY, not this FY" />
      </div>
      <p className="text-sm text-[var(--muted)]">
        Use <strong>Weekly plan</strong> to turn this pool into a time-budgeted action queue for your team.
      </p>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}
