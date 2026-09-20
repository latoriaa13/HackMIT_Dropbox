"use client";

import { useCallback, useEffect, useState } from "react";
import {
  consumeMicrosoftOAuthReturn,
  formatOAuthReturnMessage,
  markMicrosoftOAuthAttempt,
} from "@/lib/oauth-errors";

type Status = {
  connected: boolean;
  mode: string;
  provider?: "microsoft-graph";
  configurationError?: boolean;
  canStartOAuth?: boolean;
  connectUrl?: string;
  accountEmail: string | null;
  accountName: string | null;
  displayName?: string;
  email?: string;
  tenantId?: string;
  grantedScopes: string[];
  oauthConfigured: boolean;
  missingCalendarConsent?: boolean;
  missingMailConsent?: boolean;
  mailAutopilotReady?: boolean;
  calendarReady?: boolean;
  accountLinked?: boolean;
  capabilityErrors?: { calendar?: string; mail?: string };
  configErrors?: string[];
  message?: string;
};

type PendingDraft = {
  draftId: string;
  approvalToken: string;
  subject: string;
  to?: string[];
  bodyPreview: string;
  body?: string;
  mode: string;
};

export default function Autoview() {
  const [status, setStatus] = useState<Status | null>(null);
  const [emails, setEmails] = useState<PendingDraft[]>([]);
  const [events, setEvents] = useState<PendingDraft[]>([]);
  const [audit, setAudit] = useState<
    Array<{ actionType: string; status: string; payloadSummary: string; createdAt: string }>
  >([]);
  const [tasks, setTasks] = useState<
    Array<{ id: string; title: string; status: string; instruction: string }>
  >([]);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [st, pending, aud, t] = await Promise.all([
        fetch("/api/m365/status?verify=1").then((r) => r.json()),
        fetch("/api/automation/pending").then((r) => r.json()),
        fetch("/api/automation/audit").then((r) => r.json()),
        fetch("/api/automation/tasks").then((r) => r.json()),
      ]);
      setStatus(st);
      setEmails(pending.emails ?? []);
      setEvents(pending.events ?? []);
      setAudit(aud.logs ?? []);
      setTasks(t.tasks ?? []);
    } catch (err) {
      console.error("Error refreshing autopilot state:", err);
    }
  }, []);

  useEffect(() => {
    refresh();
    const p = new URLSearchParams(window.location.search);
    const connected = p.get("connected");
    const error = p.get("error");
    const calendarConnected = p.get("calendar_connected");
    const mailConnected = p.get("mail_connected");
    if ((connected || calendarConnected || mailConnected) && consumeMicrosoftOAuthReturn()) {
      const code = calendarConnected
        ? "calendar_connected"
        : mailConnected
        ? "mail_connected"
        : "connected";
      setMsg(formatOAuthReturnMessage(code));
      refresh();
    } else if (error && consumeMicrosoftOAuthReturn()) {
      setMsg(formatOAuthReturnMessage(error));
    }
  }, [refresh]);

  const approve = async (kind: "email" | "event", draft: PendingDraft, decision: "approve" | "reject") => {
    const res = await fetch("/api/automation/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        draftId: draft.draftId,
        approvalToken: draft.approvalToken,
        decision,
      }),
    });
    const data = await res.json();
    setMsg(decision === "approve" ? data.message ?? "Executed" : "Rejected");
    refresh();
  };

  const createTask = async () => {
    const res = await fetch("/api/automation/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Monday top-5 follow-up drafts",
        instruction: "Every Monday at 9 AM, draft follow-up emails for my top five fundraising opportunities.",
        templateId: "weekly_top_opportunities",
        trigger: { type: "recurring", cron: "0 9 * * 1" },
        requiresApproval: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setMsg("Task created — use Run now to execute.");
      refresh();
    }
  };

  const runTask = async (id: string) => {
    const res = await fetch(`/api/automation/tasks/${id}/run`, { method: "POST" });
    const data = await res.json();
    setMsg(data.task ? `Task ${data.task.status}` : data.error);
    refresh();
  };

  return (
    <div className="space-y-8 text-slate-800">
      {msg && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-[#FF6B00]">
          {msg}
        </div>
      )}

      {/* Microsoft Connection Card */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
        <h2 className="text-lg font-bold text-[#0B192C]">Microsoft 365 connection</h2>
        {status && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-slate-700">
              Provider:{" "}
              <strong className="font-bold text-[#0B192C]">
                {status.connected ? "Microsoft Graph (connected)" : "Microsoft Graph (not connected)"}
              </strong>
            </p>
            {(status.displayName || status.accountName) && (
              <p className="text-slate-700">
                Name: <span className="font-semibold">{status.displayName ?? status.accountName}</span>
              </p>
            )}
            {(status.email || status.accountEmail) && (
              <p className="text-slate-700">
                Email: <span className="font-semibold">{status.email ?? status.accountEmail}</span>
              </p>
            )}
            {status.tenantId && <p className="text-xs text-slate-500">Tenant: {status.tenantId}</p>}
            {status.message && <p className="font-medium text-amber-800">{status.message}</p>}
            {status.configurationError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-900">
                Microsoft Entra configuration is missing. Set MICROSOFT_CLIENT_ID in `.env.local`.
              </p>
            )}
            {!status.configurationError && !status.connected && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
                Microsoft 365 connection required — connect to draft email, find meeting times, and run automation tasks.
              </p>
            )}
            {status.mailAutopilotReady && (
              <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-medium text-green-900">
                Mail verified — you can draft and approve email through Graph.
              </p>
            )}
            {status.accountLinked && !status.mailAutopilotReady && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
                Mail not verified yet — connect mail to draft and send email.
              </p>
            )}
            {status.capabilityErrors?.mail && (
              <p className="text-sm font-medium text-red-800">{status.capabilityErrors.mail}</p>
            )}
            {status.capabilityErrors?.calendar && (
              <p className="text-sm font-medium text-red-800">{status.capabilityErrors.calendar}</p>
            )}
            {status.grantedScopes?.length > 0 && (
              <p className="text-xs text-slate-500">Granted: {status.grantedScopes.join(", ")}</p>
            )}
            <div className="flex flex-wrap gap-3 pt-3">
              {!status.connected && status.canStartOAuth !== false && (
                <a
                  href={status.connectUrl ?? "/api/auth/microsoft/connect"}
                  onClick={() => markMicrosoftOAuthAttempt()}
                  className="rounded-xl bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#E56000]"
                >
                  Connect Microsoft 365
                </a>
              )}
              {status.connected && status.missingCalendarConsent && (
                <MicrosoftPermissionConnect
                  consent="calendar"
                  returnTo="/?tab=autopilot"
                  label="Connect calendar"
                />
              )}
              {status.connected && status.missingMailConsent && (
                <MicrosoftPermissionConnect consent="mail" returnTo="/?tab=autopilot" label="Connect mail" />
              )}
              {status.connected && (
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-100"
                  onClick={async () => {
                    await fetch("/api/auth/microsoft/disconnect", { method: "POST" });
                    setMsg("Disconnected from Microsoft 365.");
                    refresh();
                  }}
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Approval Inbox Section */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
        <h2 className="text-lg font-bold text-[#0B192C]">Approval inbox</h2>
        {!status?.mailAutopilotReady && (
          <p className="mt-2 text-sm font-medium text-amber-900">
            Connect mail (verified) to create and approve email drafts.
          </p>
        )}
        {status?.mailAutopilotReady && emails.length === 0 && events.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">
            No pending drafts. Use Draft follow-up on the weekly queue.
          </p>
        )}

        {events.map((d) => (
          <div key={d.draftId} className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-xs">
            <p className="font-bold text-[#0B192C]">Calendar event · {d.subject}</p>
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {d.body ?? d.bodyPreview}
            </pre>
            <p className="mt-2 text-xs font-semibold text-amber-800">
              Microsoft Graph — invitations require approval
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                className="rounded-lg bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#E56000]"
                onClick={() => approve("event", d, "approve")}
              >
                Approve send invitations
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-100"
                onClick={() => approve("event", d, "reject")}
              >
                Reject
              </button>
            </div>
          </div>
        ))}

        {emails.map((d) => (
          <div key={d.draftId} className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-xs">
            <p className="font-bold text-[#0B192C]">Email → {(d.to ?? []).join(", ")}</p>
            <p className="text-slate-600">{d.subject}</p>
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {d.body ?? d.bodyPreview}
            </pre>
            <p className="mt-2 text-xs font-semibold text-amber-800">
              Microsoft Graph — send requires approval
            </p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                className="rounded-lg bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#E56000]"
                onClick={() => approve("email", d, "approve")}
              >
                Approve send
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-100"
                onClick={() => approve("email", d, "reject")}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Automation Tasks Section */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B192C]">Automation tasks</h2>
          <button
            type="button"
            disabled={!status?.mailAutopilotReady}
            onClick={createTask}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-100 disabled:opacity-50"
          >
            + Weekly top-5 template
          </button>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs"
            >
              <span className="font-medium text-[#0B192C]">
                {t.title} · <span className="font-normal text-slate-500">{t.status}</span>
              </span>
              <button
                type="button"
                className="text-xs font-bold text-[#FF6B00] hover:underline"
                onClick={() => runTask(t.id)}
              >
                Run now
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Activity Log Section */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-xs">
        <h2 className="text-lg font-bold text-[#0B192C]">Activity log</h2>
        <ul className="mt-3 max-h-64 overflow-y-auto divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-xs">
          {audit.map((l, i) => (
            <li key={i} className="py-2 first:pt-0 last:pb-0">
              <span className="font-semibold text-slate-500">{l.createdAt.slice(0, 19)}</span> ·{" "}
              <span className="font-medium text-[#0B192C]">{l.actionType}</span> ·{" "}
              <span className="text-slate-700">{l.status}</span> · {l.payloadSummary}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}