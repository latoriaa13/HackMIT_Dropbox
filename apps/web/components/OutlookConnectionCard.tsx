"use client";

import { useCallback, useEffect, useState } from "react";
import { consumeMicrosoftOAuthReturn, formatOAuthReturnMessage } from "@/lib/oauth-errors";
import { formatM365UserError } from "@/lib/m365-user-errors";
import { MicrosoftPermissionConnect } from "@/components/MicrosoftPermissionConnect";

type M365Status = {
  accountLinked?: boolean;
  connected?: boolean;
  outlookReady?: boolean;
  mailAutopilotReady?: boolean;
  calendarReady?: boolean;
  mailReady?: boolean;
  canStartOAuth?: boolean;
  configurationError?: boolean;
  email?: string;
  accountEmail?: string;
  message?: string;
  missingCalendarConsent?: boolean;
  missingMailConsent?: boolean;
  grantedScopes?: string[];
  capabilityErrors?: { profile?: string; calendar?: string; mail?: string };
};

type CalendarCache = {
  syncedAt: string;
  weekStart: string;
  weekEnd: string;
} | null;

export function OutlookConnectionCard({
  onConnectionChange,
}: {
  onConnectionChange?: (outlookReady: boolean) => void;
}) {
  const [status, setStatus] = useState<M365Status | null>(null);
  const [cache, setCache] = useState<CalendarCache>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [permissionError, setPermissionError] = useState<ReturnType<typeof formatM365UserError> | null>(
    null
  );

  const load = useCallback(async (verify = false) => {
    const q = verify ? "?verify=1" : "";
    const st = await fetch(`/api/m365/status${q}`).then((r) => r.json());
    setStatus(st);
    onConnectionChange?.(st.outlookReady === true);

    if (st.outlookReady) {
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
      } else setCache(null);
    } else {
      setCache(null);
    }
    setPermissionError(null);
  }, [onConnectionChange]);

  useEffect(() => {
    load();
    const p = new URLSearchParams(window.location.search);
    for (const key of ["connected", "calendar_connected", "mail_connected", "error"] as const) {
      const val = p.get(key);
      if (key === "error" && val && consumeMicrosoftOAuthReturn()) {
        setBanner({ type: "err", text: formatOAuthReturnMessage(val) });
        window.history.replaceState({}, "", "/");
        break;
      }
      if (key !== "error" && val && consumeMicrosoftOAuthReturn()) {
        setBanner({ type: "ok", text: formatOAuthReturnMessage(key) });
        window.history.replaceState({}, "", "/");
        load(true);
        break;
      }
    }
  }, [load]);

  const refreshCalendar = async () => {
    if (!status?.outlookReady) {
      setPermissionError(
        formatM365UserError({ code: "MICROSOFT365_PERMISSION_ERROR", requiredScopes: ["Calendars.Read"] })
      );
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch("/api/m365/calendar/refresh", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPermissionError(formatM365UserError(data));
        return;
      }
      setBanner({ type: "ok", text: "Outlook calendar updated." });
      await load(true);
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

  if (!status.accountLinked) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-5">
        <h2 className="text-lg font-semibold text-blue-950">Connect to Outlook</h2>
        <p className="mt-2 max-w-xl text-sm text-blue-900">
          Sign in with Microsoft and approve <strong>Calendars.Read</strong> so Tuesday can read availability and
          plan around real meetings.
        </p>
        {status.configurationError ? (
          <p className="mt-3 text-sm text-red-800">Microsoft Entra is not configured on this server.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <MicrosoftPermissionConnect consent="full" returnTo="/" label="Connect to Outlook" variant="primary" />
          </div>
        )}
        {banner && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${banner.type === "ok" ? "bg-green-100" : "bg-red-100"}`}>
            {banner.text}
          </p>
        )}
      </div>
    );
  }

  if (!status.outlookReady) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-5">
        {banner && (
          <p className={`mb-3 rounded-lg px-3 py-2 text-sm ${banner.type === "ok" ? "bg-green-100" : "bg-red-100"}`}>
            {banner.text}
          </p>
        )}
        <h2 className="text-lg font-semibold text-amber-950">Microsoft signed in — calendar not verified</h2>
        <p className="mt-2 text-sm text-amber-900">{email}</p>
        <p className="mt-2 max-w-xl text-sm text-amber-900">
          {status.message ??
            "We could not read your Outlook calendar yet. Connect calendar permissions (same flow as mail on Autopilot)."}
        </p>
        {status.capabilityErrors?.calendar && (
          <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {status.capabilityErrors.calendar}
          </p>
        )}
        {status.capabilityErrors?.mail && (
          <p className="mt-2 text-xs text-amber-800">{status.capabilityErrors.mail}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <MicrosoftPermissionConnect consent="calendar" returnTo="/" label="Connect calendar" variant="primary" />
          <MicrosoftPermissionConnect consent="full" returnTo="/" label="Reconnect (all permissions)" />
          <button type="button" onClick={disconnect} className="rounded-lg border bg-white px-3 py-2 text-sm">
            Disconnect
          </button>
        </div>
        {permissionError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
            <p className="font-medium">{permissionError.title}</p>
            <p className="mt-1">{permissionError.detail}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/60 p-5">
      {banner && (
        <p className={`mb-3 rounded-lg px-3 py-2 text-sm ${banner.type === "ok" ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}>
          {banner.text}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">Outlook calendar connected</h2>
          <p className="mt-1 text-sm text-green-900">{email}</p>
          <p className="mt-1 text-xs text-green-800">Verified with Microsoft Graph — availability and refresh use live data.</p>
          {status.grantedScopes && status.grantedScopes.length > 0 && (
            <p className="mt-1 text-xs text-green-800">Token scopes: {status.grantedScopes.join(", ")}</p>
          )}
          {!status.mailAutopilotReady && (
            <p className="mt-2 text-xs text-amber-900">
              Mail not verified for send — use Autopilot → Connect mail for email drafts.
            </p>
          )}
          {cache?.syncedAt && (
            <p className="mt-1 text-xs text-green-800">
              Last sync: {new Date(cache.syncedAt).toLocaleString()}
              {cache.weekStart && ` · week ${cache.weekStart}`}
            </p>
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
      {permissionError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
          <p className="font-medium">{permissionError.title}</p>
          <p className="mt-1">{permissionError.detail}</p>
          {permissionError.action && (
            <MicrosoftPermissionConnect
              consent={permissionError.action.consent}
              returnTo="/"
              label={permissionError.action.label}
              variant="primary"
              className="mt-2"
            />
          )}
        </div>
      )}
    </div>
  );
}
