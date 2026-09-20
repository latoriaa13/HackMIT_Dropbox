"use client";

import { useCallback, useEffect, useState } from "react";
import { consumeMicrosoftOAuthReturn, formatOAuthReturnMessage } from "@/lib/oauth-errors";
import { formatM365UserError, type M365UserErrorContext } from "@/lib/m365-user-errors";
import { MicrosoftPermissionConnect } from "@/components/MicrosoftPermissionConnect";
import {
  gmailInOutlookVsGraphMessage,
  guestExternalAccountMessage,
  isGuestExternalMicrosoftAccount,
} from "@/lib/microsoft-account-hints";
import { useM365Session } from "@/components/M365SessionContext";

type M365Status = {
  accountLinked?: boolean;
  isGuestExternalAccount?: boolean;
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
  planningWeekStart,
  onConnectionChange,
  onCalendarSynced,
}: {
  /** Monday of the week shown on the weekly plan (must match calendar sync). */
  planningWeekStart?: string;
  onConnectionChange?: (
    outlookReady: boolean,
    meta?: { email?: string | null; isGuestExternalAccount?: boolean }
  ) => void;
  onCalendarSynced?: (info: { eventCount: number; weekStart: string; weekEnd?: string }) => void;
}) {
  const m365Ctx = useM365Session();
  const [status, setStatus] = useState<M365Status | null>(null);
  const [cache, setCache] = useState<CalendarCache>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [permissionError, setPermissionError] = useState<ReturnType<typeof formatM365UserError> | null>(
    null
  );
  const [syncWarning, setSyncWarning] = useState<ReturnType<typeof formatM365UserError> | null>(null);

  const errorContext = (st: M365Status | null): M365UserErrorContext => ({
    accountEmail: st?.email ?? st?.accountEmail ?? null,
    outlookReady: st?.outlookReady === true,
    missingCalendarConsent: st?.missingCalendarConsent,
  });

  const applyCalendarError = (st: M365Status | null, data: Record<string, unknown>) => {
    const formatted = formatM365UserError(data as Parameters<typeof formatM365UserError>[0], errorContext(st));
    if (formatted.severity === "warning") {
      setSyncWarning(formatted);
      setPermissionError(null);
    } else {
      setPermissionError(formatted);
      setSyncWarning(null);
    }
  };

  const load = useCallback(async (verify = false) => {
    const q = verify ? "?verify=1" : "";
    const st = await fetch(`/api/m365/status${q}`).then((r) => r.json());
    setStatus(st);
    onConnectionChange?.(st.outlookReady === true, {
      email: st.email ?? st.accountEmail ?? null,
      isGuestExternalAccount: st.isGuestExternalAccount,
    });

    if (st.outlookReady) {
      const ws = planningWeekStart ? `weekStart=${encodeURIComponent(planningWeekStart)}&` : "";
      const weekRes = await fetch(`/api/m365/calendar/week?${ws}sync=1`);
      const week = await weekRes.json().catch(() => ({}));
      if (!weekRes.ok) {
        applyCalendarError(st, week);
        setCache(null);
        return;
      }
      setSyncWarning(null);
      setPermissionError(null);
      if (week.cache) {
        setCache({
          syncedAt: week.cache.syncedAt,
          weekStart: week.cache.weekStart,
          weekEnd: week.cache.weekEnd,
        });
      } else setCache(null);
    } else {
      setCache(null);
      setPermissionError(null);
      setSyncWarning(null);
    }
  }, [onConnectionChange, planningWeekStart]);

  useEffect(() => {
    void (async () => {
      await load();
      const p = new URLSearchParams(window.location.search);
      for (const key of ["connected", "calendar_connected", "mail_connected", "error"] as const) {
        const val = p.get(key);
        if (!val && key !== "error") continue;
        if (key === "error" && val && consumeMicrosoftOAuthReturn()) {
          setBanner({ type: "err", text: formatOAuthReturnMessage(val) });
          window.history.replaceState({}, "", "/");
          break;
        }
        if (key !== "error" && val && consumeMicrosoftOAuthReturn()) {
          window.history.replaceState({}, "", "/");
          await load(false);
          const st = await fetch("/api/m365/status").then((r) => r.json());
          setStatus(st);
          onConnectionChange?.(st.outlookReady === true, {
      email: st.email ?? st.accountEmail ?? null,
      isGuestExternalAccount: st.isGuestExternalAccount,
    });
          await m365Ctx?.refresh(false);
          void fetch("/api/m365/status?verify=1")
            .then((r) => r.json())
            .then((verifiedSt) => {
              if (verifiedSt.capabilityErrors?.calendar || verifiedSt.capabilityErrors?.mail) {
                setStatus((prev) => ({
                  ...prev,
                  ...verifiedSt,
                  outlookReady: prev?.outlookReady ?? verifiedSt.outlookReady,
                  mailAutopilotReady: prev?.mailAutopilotReady ?? verifiedSt.mailAutopilotReady,
                  capabilityErrors: verifiedSt.capabilityErrors,
                }));
              }
            })
            .catch(() => null);
          const signedInOk = st.outlookReady || st.mailAutopilotReady;
          if (signedInOk) {
            setBanner({ type: "ok", text: formatOAuthReturnMessage(key) });
          } else if (st.isGuestExternalAccount) {
            setBanner({
              type: "err",
              text: "This work or school guest sign-in usually can’t use Outlook calendar here. Try Connect — personal (outlook.com) with the account you use in Outlook.",
            });
          } else {
            setBanner({
              type: "err",
              text:
                key === "calendar_connected"
                  ? "You signed in, but your calendar still isn’t connected. Click Connect calendar and choose Allow."
                  : key === "mail_connected"
                    ? "You signed in, but email still isn’t connected. Open Autopilot and click Connect mail."
                    : "You signed in, but we couldn’t confirm Outlook access. Try Connect calendar or Reconnect below.",
            });
          }
          break;
        }
      }
    })();
  }, [load, onConnectionChange]);

  const refreshCalendar = async () => {
    if (!status?.outlookReady) {
      applyCalendarError(status, {
        code: "MICROSOFT365_PERMISSION_ERROR",
        requiredScopes: ["Calendars.Read"],
      });
      return;
    }
    setRefreshing(true);
    setPermissionError(null);
    setSyncWarning(null);
    try {
      const res = await fetch("/api/m365/calendar/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: planningWeekStart }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        applyCalendarError(status, data);
        return;
      }
      const count = data.calendarSync?.eventCount ?? data.outlookEvents?.length ?? 0;
      const ws = data.calendarSync?.weekStart ?? planningWeekStart ?? "";
      const we = data.calendarSync?.weekEnd;
      if (count === 0) {
        setBanner({
          type: "ok",
          text: we
            ? `Calendar refreshed for ${ws} – ${we}. No meetings found that week in Outlook (try another planning week if your events are elsewhere).`
            : "Calendar refreshed. No meetings found for your planning week in Outlook.",
        });
      } else {
        setBanner({
          type: "ok",
          text: `Loaded ${count} Outlook meeting${count === 1 ? "" : "s"} for week of ${ws}.`,
        });
      }
      onCalendarSynced?.({ eventCount: count, weekStart: ws, weekEnd: we });
      await load(false);
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
  const isGuestExternal =
    status?.isGuestExternalAccount === true || isGuestExternalMicrosoftAccount(email ?? undefined);

  if (!status) return null;

  if (!status.accountLinked) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-5">
        <h2 className="text-lg font-semibold text-blue-950">Connect to Outlook</h2>
        <p className="mt-2 max-w-xl text-sm text-blue-900">
          Use the same kind of sign-in as{" "}
          <a href="https://outlook.live.com/mail/" className="font-medium underline" target="_blank" rel="noreferrer">
            outlook.com
          </a>
          . When Microsoft asks, choose <strong>Allow</strong> so Tuesday can see when you’re free. Not sure which
          type you use? Try personal first (most @outlook.com and @hotmail.com accounts).
        </p>
        {status.configurationError ? (
          <p className="mt-3 text-sm text-red-800">Microsoft sign-in isn’t set up for this app yet.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <MicrosoftPermissionConnect
              consent="full"
              returnTo="/"
              label="Connect — personal (outlook.com)"
              variant="primary"
              accountKind="personal"
            />
            <MicrosoftPermissionConnect
              consent="full"
              returnTo="/"
              label="Connect — work or school"
              accountKind="work"
            />
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
        <h2 className="text-lg font-semibold text-amber-950">Signed in — calendar not connected yet</h2>
        <p className="mt-2 text-sm text-amber-900">{email}</p>
        {isGuestExternal && (
          <div className="mt-3 space-y-2 rounded-lg border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-950">
            <p className="font-medium">{guestExternalAccountMessage()}</p>
            <p>{gmailInOutlookVsGraphMessage()}</p>
          </div>
        )}
        <p className="mt-2 max-w-xl text-sm text-amber-900">
          {status.message ??
            "We couldn't read your Outlook calendar yet. Click Connect calendar and choose Allow when Microsoft asks."}
        </p>
        {(() => {
          const cal = status.capabilityErrors?.calendar;
          const mail = status.capabilityErrors?.mail;
          const same = cal && mail && cal === mail;
          if (same) {
            return (
              <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{cal}</p>
            );
          }
          return (
            <>
              {cal && (
                <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{cal}</p>
              )}
              {mail && mail !== cal && <p className="mt-2 text-xs text-amber-800">{mail}</p>}
            </>
          );
        })()}
        <div className="mt-4 flex flex-wrap gap-2">
          {isGuestExternal ? (
            <>
              <MicrosoftPermissionConnect
                consent="full"
                returnTo="/"
                label="Try personal sign-in (outlook.com)"
                variant="primary"
                reauth
                accountKind="personal"
              />
              <MicrosoftPermissionConnect
                consent="full"
                returnTo="/"
                label="Work or school sign-in"
                reauth
                accountKind="work"
              />
              <button type="button" onClick={disconnect} className="rounded-lg border bg-white px-3 py-2 text-sm">
                Disconnect
              </button>
            </>
          ) : (
            <>
              <MicrosoftPermissionConnect consent="calendar" returnTo="/" label="Connect calendar" variant="primary" />
              <MicrosoftPermissionConnect
                consent="full"
                returnTo="/"
                label="Reconnect (all permissions)"
                reauth
              />
              <button type="button" onClick={disconnect} className="rounded-lg border bg-white px-3 py-2 text-sm">
                Disconnect
              </button>
            </>
          )}
        </div>
        <p className="mt-3 text-xs text-amber-900">
          Tip: Use the same account you open in Outlook on the web. Guest or shared work sign-ins often don’t include a
          calendar Tuesday can use.
        </p>
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
                accountKind={permissionError.action.accountKind}
                reauth={permissionError.action.reauth}
              />
            )}
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
      {syncWarning && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-medium">{syncWarning.title}</p>
          <p className="mt-1">{syncWarning.detail}</p>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-green-950">Outlook calendar connected</h2>
          <p className="mt-1 text-sm text-green-900">{email}</p>
          <p className="mt-1 text-xs text-green-800">Your live Outlook calendar is used for availability and refresh.</p>
          {!status.mailAutopilotReady && (
            <p className="mt-2 text-xs text-amber-900">
              Email isn’t connected yet — open Autopilot and click Connect mail to draft and send messages.
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
              accountKind={permissionError.action.accountKind}
              reauth={permissionError.action.reauth}
            />
          )}
        </div>
      )}
    </div>
  );
}
