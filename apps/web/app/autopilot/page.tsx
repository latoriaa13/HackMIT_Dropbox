"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  consumeMicrosoftOAuthReturn,
  formatAutopilotOAuthError,
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

export default function AutopilotPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [emails, setEmails] = useState<PendingDraft[]>([]);
  const [events, setEvents] = useState<PendingDraft[]>([]);
  const [audit, setAudit] = useState<Array<{ actionType: string; status: string; payloadSummary: string; createdAt: string }>>([]);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string; instruction: string }>>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [st, pending, aud, t] = await Promise.all([
      fetch("/api/m365/status").then((r) => r.json()),
      fetch("/api/automation/pending").then((r) => r.json()),
      fetch("/api/automation/audit").then((r) => r.json()),
      fetch("/api/automation/tasks").then((r) => r.json()),
    ]);
    setStatus(st);
    setEmails(pending.emails ?? []);
    setEvents(pending.events ?? []);
    setAudit(aud.logs ?? []);
    setTasks(t.tasks ?? []);
  }, []);

  useEffect(() => {
    refresh();
    const p = new URLSearchParams(window.location.search);
    const connected = p.get("connected");
    const error = p.get("error");
    if (connected) {
      setMsg("Microsoft 365 connected — approve drafts to send through Microsoft Graph.");
      window.history.replaceState({}, "", "/autopilot");
    } else if (error && consumeMicrosoftOAuthReturn()) {
      setMsg(formatAutopilotOAuthError(error));
      window.history.replaceState({}, "", "/autopilot");
    } else if (error) {
      window.history.replaceState({}, "", "/autopilot");
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
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Tuesday Autopilot</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Prepare outreach through your Microsoft 365 mailbox and calendar. Every send and calendar invitation
          requires explicit approval in the inbox below.
        </p>
        <Link href="/" className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">
          ← Back to weekly plan
        </Link>
      </header>

      {msg && <p className="rounded-lg bg-[var(--accent-soft)] px-4 py-2 text-sm">{msg}</p>}

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Microsoft 365 connection</h2>
        {status && (
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Provider:{" "}
              <strong>
                {status.connected ? "Microsoft Graph (connected)" : "Microsoft Graph (not connected)"}
              </strong>
            </p>
            {(status.displayName || status.accountName) && (
              <p>Name: {status.displayName ?? status.accountName}</p>
            )}
            {(status.email || status.accountEmail) && (
              <p>Email: {status.email ?? status.accountEmail}</p>
            )}
            {status.tenantId && <p className="text-xs text-[var(--muted)]">Tenant: {status.tenantId}</p>}
            {status.message && <p className="text-amber-800">{status.message}</p>}
            {status.configurationError && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-900">
                Microsoft Entra configuration is missing. Set MICROSOFT_CLIENT_ID in `.env.local` (see
                `.env.example`).
              </p>
            )}
            {!status.configurationError && !status.connected && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Microsoft 365 connection required — connect to draft email, find meeting times, and run automation
                tasks.
              </p>
            )}
            {status.connected && (
              <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-green-900">
                Connected — approving drafts sends through your Microsoft mailbox and calendar.
              </p>
            )}
            {status.grantedScopes?.length > 0 && (
              <p className="text-xs text-[var(--muted)]">Granted: {status.grantedScopes.join(", ")}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {!status.connected && status.canStartOAuth !== false && (
                <a
                  href={status.connectUrl ?? "/api/auth/microsoft/connect"}
                  onClick={() => markMicrosoftOAuthAttempt()}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Connect Microsoft 365
                </a>
              )}
              {status.connected && status.missingCalendarConsent && (
                <a
                  href="/api/auth/microsoft/connect?consent=calendar"
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Request calendar access
                </a>
              )}
              {status.connected && status.missingMailConsent && (
                <a
                  href="/api/auth/microsoft/connect?consent=mail"
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Request mail access
                </a>
              )}
              {status.connected && (
                <button
                  type="button"
                  className="rounded-lg border px-4 py-2 text-sm"
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

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Approval inbox</h2>
        {!status?.connected && (
          <p className="mt-2 text-sm text-amber-900">Connect Microsoft 365 to create and approve drafts.</p>
        )}
        {status?.connected && emails.length === 0 && events.length === 0 && (
          <p className="mt-2 text-sm text-[var(--muted)]">No pending drafts. Use Draft follow-up on the weekly queue.</p>
        )}
        {events.map((d) => (
          <div key={d.draftId} className="mt-4 rounded-lg border p-4 text-sm">
            <p className="font-medium">Calendar event · {d.subject}</p>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-stone-50 p-2 text-xs">
              {d.body ?? d.bodyPreview}
            </pre>
            <p className="mt-1 text-xs text-amber-800">Microsoft Graph — invitations require approval</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="rounded bg-[var(--accent)] px-3 py-1 text-xs text-white" onClick={() => approve("event", d, "approve")}>
                Approve send invitations
              </button>
              <button type="button" className="rounded border px-3 py-1 text-xs" onClick={() => approve("event", d, "reject")}>
                Reject
              </button>
            </div>
          </div>
        ))}
        {emails.map((d) => (
          <div key={d.draftId} className="mt-4 rounded-lg border p-4 text-sm">
            <p className="font-medium">Email → {(d.to ?? []).join(", ")}</p>
            <p className="text-[var(--muted)]">{d.subject}</p>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-stone-50 p-2 text-xs">
              {d.body ?? d.bodyPreview}
            </pre>
            <p className="mt-1 text-xs text-amber-800">Microsoft Graph — send requires approval</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="rounded bg-[var(--accent)] px-3 py-1 text-xs text-white" onClick={() => approve("email", d, "approve")}>
                Approve send
              </button>
              <button type="button" className="rounded border px-3 py-1 text-xs" onClick={() => approve("email", d, "reject")}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Automation tasks</h2>
          <button
            type="button"
            disabled={!status?.connected}
            onClick={createTask}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
          >
            + Weekly top-5 template
          </button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {tasks.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
              <span>
                {t.title} · <span className="text-[var(--muted)]">{t.status}</span>
              </span>
              <button type="button" className="text-xs text-[var(--accent)]" onClick={() => runTask(t.id)}>
                Run now
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Activity log</h2>
        <ul className="mt-2 max-h-64 overflow-y-auto text-xs text-[var(--muted)]">
          {audit.map((l, i) => (
            <li key={i} className="border-b py-1">
              {l.createdAt.slice(0, 19)} · {l.actionType} · {l.status} · {l.payloadSummary}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
