"use client";

import { useCallback, useEffect, useState } from "react";
import { markMicrosoftOAuthAttempt } from "@/lib/oauth-errors";

type M365Status = {
  connected: boolean;
  canStartOAuth?: boolean;
  configurationError?: boolean;
  email?: string;
  accountEmail?: string;
  displayName?: string;
  accountName?: string;
  connectUrl?: string;
  missingCalendarConsent?: boolean;
};

type CalendarCache = {
  syncedAt: string;
  weekStart: string;
  weekEnd: string;
} | null;

export function OutlookConnectionCard({
  onConnectionChange,
}: {
  onConnectionChange?: (connected: boolean) => void;
}) {
  const [status, setStatus] = useState<M365Status | null>(null);
  const [cache, setCache] = useState<CalendarCache>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const st = await fetch("/api/m365/status").then((r) => r.json());
    setStatus(st);
    onConnectionChange?.(st.connected === true);
    if (st.connected) {
      const week = await fetch("/api/m365/calendar/week").then((r) => r.json());
      if (week.cache) {
        setCache({
          syncedAt: week.cache.syncedAt,
          weekStart: week.cache.weekStart,
          weekEnd: week.cache.weekEnd,
        });
      } else {
        setCache(null);
      }
    } else {
      setCache(null);
    }
  }, [onConnectionChange]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshCalendar = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/m365/calendar/refresh", { method: "POST" });
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const disconnect = async () => {
    await fetch("/api/auth/microsoft/disconnect", { method: "POST" });
    await load();
  };

  const email = status?.email ?? status?.accountEmail;

  if (!status) return null;

  if (!status.connected) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-5">
        <h2 className="text-lg font-semibold text-blue-950">Connect to Outlook</h2>
        <p className="mt-2 max-w-xl text-sm text-blue-900">
          Connect your Outlook calendar so Tuesday can plan around your real meetings and propose
          realistic times for fundraising work.
        </p>
        {status.configurationError ? (
          <p className="mt-3 text-sm text-red-800">Microsoft Entra is not configured on this server.</p>
        ) : (
          <a
            href={status.connectUrl ?? "/api/auth/microsoft/connect"}
            onClick={() => markMicrosoftOAuthAttempt()}
            className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Connect to Outlook
          </a>
        )}
        <p className="mt-3 text-xs text-blue-800">No simulated calendar data — connection required.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">Connected to Outlook</h2>
          <p className="mt-1 text-sm text-green-900">{email ?? "Microsoft 365 account"}</p>
          {cache?.syncedAt && (
            <p className="mt-1 text-xs text-green-800">
              Last calendar sync: {new Date(cache.syncedAt).toLocaleString()}
              {cache.weekStart && ` · week ${cache.weekStart}`}
            </p>
          )}
          {!cache?.syncedAt && (
            <p className="mt-1 text-xs text-amber-900">Calendar not synced yet — build or refresh your schedule.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={refreshCalendar}
            className="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh calendar"}
          </button>
          <button type="button" onClick={disconnect} className="rounded-lg border bg-white px-3 py-2 text-sm">
            Disconnect
          </button>
        </div>
      </div>
      {status.missingCalendarConsent && (
        <a
          href="/api/auth/microsoft/connect?consent=calendar"
          className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline"
        >
          Grant calendar access
        </a>
      )}
    </div>
  );
}
