"use client";

import { useCallback, useEffect, useState } from "react";
import { consumeMicrosoftOAuthReturn, formatOAuthReturnMessage } from "@/lib/oauth-errors";
import { formatM365UserError } from "@/lib/m365-user-errors";
import { MicrosoftPermissionConnect } from "@/components/MicrosoftPermissionConnect";

type M365Status = {
  connected: boolean;
  canStartOAuth?: boolean;
  configurationError?: boolean;
  email?: string;
  accountEmail?: string;
  connectUrl?: string;
  missingCalendarConsent?: boolean;
  missingMailConsent?: boolean;
  grantedScopes?: string[];
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
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [permissionError, setPermissionError] = useState<ReturnType<typeof formatM365UserError> | null>(
    null
  );

  const load = useCallback(async () => {
    const st = await fetch("/api/m365/status").then((r) => r.json());
    setStatus(st);
    onConnectionChange?.(st.connected === true && !st.missingCalendarConsent);
    setPermissionError(null);

    if (st.connected && !st.missingCalendarConsent) {
      const weekRes = await fetch("/api/m365/calendar/week");
      const week = await weekRes.json().catch(() => ({}));
      if (!weekRes.ok) {
        setPermissionError(formatM365UserError(week));
        setCache(null);
        return;
      }
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
    const p = new URLSearchParams(window.location.search);
    const oauthCodes = ["connected", "calendar_connected", "mail_connected", "error"] as const;
    for (const key of oauthCodes) {
      const val = p.get(key);
      if (!val && key !== "error") continue;
      if (key === "error" && val && consumeMicrosoftOAuthReturn()) {
        setBanner({ type: "err", text: formatOAuthReturnMessage(val) });
        window.history.replaceState({}, "", "/");
        break;
      }
      if (key !== "error" && val && consumeMicrosoftOAuthReturn()) {
        setBanner({ type: "ok", text: formatOAuthReturnMessage(key) });
        window.history.replaceState({}, "", "/");
        load();
        break;
      }
    }
  }, [load]);

  const refreshCalendar = async () => {
    if (status?.missingCalendarConsent) {
      setPermissionError(formatM365UserError({ code: "MICROSOFT365_PERMISSION_ERROR", requiredScopes: ["Calendars.Read"] }));
      return;
    }
    setRefreshing(true);
    setPermissionError(null);
    try {
      const res = await fetch("/api/m365/calendar/refresh", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPermissionError(formatM365UserError(data));
        return;
      }
      setBanner({ type: "ok", text: "Outlook calendar updated." });
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const disconnect = async () => {
    await fetch("/api/auth/microsoft/disconnect", { method: "POST" });
    setBanner({ type: "ok", text: "Disconnected from Microsoft 365." });
    await load();
  };

  const email = status?.email ?? status?.accountEmail;

  if (!status) return null;

  if (!status.connected) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-5">
        <h2 className="text-lg font-semibold text-blue-950">Connect to Outlook</h2>
        <p className="mt-2 max-w-xl text-sm text-blue-900">
          Sign in with Microsoft to read your Outlook calendar and plan fundraising work around real
          meetings.
        </p>
        {status.configurationError ? (
          <p className="mt-3 text-sm text-red-800">Microsoft Entra is not configured on this server.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <MicrosoftPermissionConnect
              consent="full"
              returnTo="/"
              label="Connect to Outlook"
              variant="primary"
            />
          </div>
        )}
        <p className="mt-3 text-xs text-blue-800">No simulated calendar data — connection required.</p>
        {banner && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${banner.type === "ok" ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}
          >
            {banner.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/60 p-5">
      {banner && (
        <p
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${banner.type === "ok" ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}
        >
          {banner.text}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">Connected to Outlook</h2>
          <p className="mt-1 text-sm text-green-900">{email ?? "Microsoft 365 account"}</p>
          {status.grantedScopes && status.grantedScopes.length > 0 && (
            <p className="mt-1 text-xs text-green-800">
              Permissions: {status.grantedScopes.filter((s) => !s.includes("offline")).join(", ")}
            </p>
          )}
          {cache?.syncedAt && (
            <p className="mt-1 text-xs text-green-800">
              Last calendar sync: {new Date(cache.syncedAt).toLocaleString()}
              {cache.weekStart && ` · week ${cache.weekStart}`}
            </p>
          )}
          {!cache?.syncedAt && !status.missingCalendarConsent && (
            <p className="mt-1 text-xs text-amber-900">Calendar not synced yet — build or refresh your schedule.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={refreshing || status.missingCalendarConsent}
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
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Calendar not connected yet</p>
          <p className="mt-1">
            Your Microsoft account is linked, but Outlook calendar access was not approved. Use the same
            flow as mail — Microsoft will ask you to allow <strong>Calendars.Read</strong>.
          </p>
          <div className="mt-3">
            <MicrosoftPermissionConnect
              consent="calendar"
              returnTo="/"
              label="Connect calendar"
              variant="primary"
            />
          </div>
        </div>
      )}

      {status.connected && !status.missingCalendarConsent && status.missingMailConsent && (
        <div className="mt-4 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm">
          <p className="font-medium">Mail optional for this page</p>
          <p className="mt-1 text-[var(--muted)]">
            Calendar is connected. Connect mail separately if you want Autopilot email drafts.
          </p>
          <div className="mt-2">
            <MicrosoftPermissionConnect consent="mail" returnTo="/" label="Connect mail" />
          </div>
        </div>
      )}

      {permissionError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
          <p className="font-medium">{permissionError.title}</p>
          <p className="mt-1">{permissionError.detail}</p>
          {permissionError.action && (
            <MicrosoftPermissionConnect
              consent={permissionError.action.consent}
              returnTo={permissionError.action.returnTo ?? "/"}
              label={permissionError.action.label}
              variant="primary"
              className="mt-3"
            />
          )}
        </div>
      )}
    </div>
  );
}
