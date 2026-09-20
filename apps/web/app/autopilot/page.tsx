"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  consumeMicrosoftOAuthReturn,
  formatOAuthReturnMessage,
  markMicrosoftOAuthAttempt,
} from "@/lib/oauth-errors";
import { MicrosoftPermissionConnect } from "@/components/MicrosoftPermissionConnect";
import {
  guestExternalAccountMessage,
  isGuestExternalMicrosoftAccount,
} from "@/lib/microsoft-account-hints";

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
  isGuestExternalAccount?: boolean;
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

export default function AutopilotPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [emails, setEmails] = useState<PendingDraft[]>([]);
  const [events, setEvents] = useState<PendingDraft[]>([]);
  const [audit, setAudit] = useState<Array<{ actionType: string; status: string; payloadSummary: string; createdAt: string }>>([]);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string; instruction: string }>>([]);
  const [inboxTab, setInboxTab] = useState<"pending" | "completed">("pending");
  const [scheduleApproved, setScheduleApproved] = useState<
    Array<{ id: string; title: string; constituentName: string }>
  >([]);
  const [completedItems, setCompletedItems] = useState<{
    audit: Array<{ actionType: string; payloadSummary: string; createdAt: string; target: string }>;
    scheduleTasks: Array<{ id: string; title: string; constituentName: string }>;
    automationTasks: Array<{ id: string; title: string }>;
  }>({ audit: [], scheduleTasks: [], automationTasks: [] });
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [st, pending, aud, t, done, sched] = await Promise.all([
      fetch("/api/m365/status?verify=1").then((r) => r.json()),
      fetch("/api/automation/pending").then((r) => r.json()),
      fetch("/api/automation/audit").then((r) => r.json()),
      fetch("/api/automation/tasks").then((r) => r.json()),
      fetch("/api/automation/completed").then((r) => r.json()),
      fetch("/api/tuesday/schedule").then((r) => r.json()),
    ]);
    setStatus(st);
    setEmails(pending.emails ?? []);
    setEvents(pending.events ?? []);
    setAudit(aud.logs ?? []);
    setTasks(t.tasks ?? []);
    setCompletedItems({
      audit: done.audit ?? [],
      scheduleTasks: done.scheduleTasks ?? [],
      automationTasks: done.automationTasks ?? [],
    });
    const approved =
      sched.schedule?.tasks?.filter(
        (task: { schedulingStatus: string }) => task.schedulingStatus === "approved"
      ) ?? [];
    setScheduleApproved(
      approved.map((task: { id: string; title: string; constituentName: string }) => ({
        id: task.id,
        title: task.title,
        constituentName: task.constituentName,
      }))
    );
  }, []);

  useEffect(() => {
    refresh();
    const p = new URLSearchParams(window.location.search);
    const tab = p.get("tab");
    if (tab === "pending" || tab === "completed") setInboxTab(tab);
    const connected = p.get("connected");
    const error = p.get("error");
    const calendarConnected = p.get("calendar_connected");
    const mailConnected = p.get("mail_connected");
    if ((connected || calendarConnected || mailConnected) && consumeMicrosoftOAuthReturn()) {
      const code = calendarConnected ? "calendar_connected" : mailConnected ? "mail_connected" : "connected";
      setMsg(formatOAuthReturnMessage(code));
      window.history.replaceState({}, "", "/autopilot");
      refresh();
    } else if (error && consumeMicrosoftOAuthReturn()) {
      setMsg(formatOAuthReturnMessage(error));
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
    if (!res.ok) {
      setMsg(
        data.message && !/graph|token|scope|403|401/i.test(String(data.message))
          ? data.message
          : "We couldn't send that message. Try Connect mail and choose Allow when Microsoft asks."
      );
      return;
    }
    setMsg(
      decision === "approve"
        ? (data.message ?? "Sent — see Completed tab.")
        : (data.message ?? "Rejected")
    );
    if (decision === "approve") {
      setInboxTab("completed");
      window.history.replaceState({}, "", "/autopilot?tab=completed");
    }
    refresh();
  };

  const completeAutomationTask = async (id: string) => {
    const res = await fetch(`/api/automation/tasks/${id}/complete`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMsg(data.error ?? "Could not complete task");
    else {
      setMsg(data.message ?? "Task marked complete.");
      setInboxTab("completed");
      window.history.replaceState({}, "", "/autopilot?tab=completed");
      refresh();
    }
  };

  const completeScheduleTask = async (taskId: string) => {
    const res = await fetch(`/api/tuesday/schedule/${taskId}/complete`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) setMsg(data.message ?? data.error ?? "Could not complete task");
    else {
      setMsg(data.message ?? "Task marked complete.");
      setInboxTab("completed");
      window.history.replaceState({}, "", "/autopilot?tab=completed");
      refresh();
    }
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
        <h1 className="text-2xl font-bold text-[var(--donorex-navy)]">DonoRex Autopilot</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Prepare outreach through your Outlook email and calendar. Every send and meeting invitation needs your
          approval in the inbox below.
        </p>
        <Link href="/" className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">
          ← Back to weekly plan
        </Link>
      </header>

      {msg && <p className="rounded-lg bg-[var(--accent-soft)] px-4 py-2 text-sm">{msg}</p>}

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Outlook connection</h2>
        {status && (
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Status:{" "}
              <strong>{status.connected ? "Connected" : "Not connected"}</strong>
            </p>
            {(status.displayName || status.accountName) && (
              <p>Name: {status.displayName ?? status.accountName}</p>
            )}
            {(status.email || status.accountEmail) && (
              <p>Signed in as: {status.email ?? status.accountEmail}</p>
            )}
            {status.message && <p className="text-amber-800">{status.message}</p>}
            {status.configurationError && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-900">
                Microsoft sign-in isn’t set up for this app yet. Ask whoever manages DonoRex to finish setup.
              </p>
            )}
            {!status.configurationError && !status.connected && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Connect Outlook to draft email, find meeting times, and run automated follow-ups.
              </p>
            )}
            {status.mailAutopilotReady && (
              <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-green-900">
                Email is connected — you can draft and approve messages here.
              </p>
            )}
            {status.accountLinked && !status.mailAutopilotReady && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Email isn’t connected yet — click Connect mail and choose Allow when Microsoft asks.
              </p>
            )}
            {status.isGuestExternalAccount && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                {guestExternalAccountMessage()} Use <strong>Connect personal Outlook (email)</strong>{" "}
                below — pick your @outlook.com account, not a guest work sign-in.
              </p>
            )}
            {status.capabilityErrors?.mail && !status.isGuestExternalAccount && (
              <p className="text-sm text-red-800">{status.capabilityErrors.mail}</p>
            )}
            {status.capabilityErrors?.calendar && (
              <p className="text-sm text-red-800">{status.capabilityErrors.calendar}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {!status.connected && status.canStartOAuth !== false && (
                <MicrosoftPermissionConnect
                  consent="mail"
                  returnTo="/autopilot"
                  label="Connect personal Outlook (email)"
                  variant="primary"
                  pickAccount
                  accountKind="personal"
                />
              )}
              {status.connected && status.missingCalendarConsent && (
                <MicrosoftPermissionConnect
                  consent="calendar"
                  returnTo="/autopilot"
                  label="Connect calendar"
                />
              )}
              {status.connected && status.missingMailConsent && (
                <MicrosoftPermissionConnect
                  consent="mail"
                  returnTo="/autopilot"
                  label="Connect personal Outlook (email)"
                  pickAccount
                  accountKind="personal"
                  reauth={status.isGuestExternalAccount}
                />
              )}
              {status.connected && (
                <button
                  type="button"
                  className="rounded-lg border px-4 py-2 text-sm"
                  onClick={async () => {
                    await fetch("/api/auth/microsoft/disconnect", { method: "POST" });
                    setMsg("Disconnected from Outlook.");
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Approval inbox</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setInboxTab("pending");
                window.history.replaceState({}, "", "/autopilot?tab=pending");
              }}
              className={`rounded-lg px-3 py-1 text-sm ${
                inboxTab === "pending" ? "bg-[var(--accent)] text-white" : "border bg-white"
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => {
                setInboxTab("completed");
                window.history.replaceState({}, "", "/autopilot?tab=completed");
              }}
              className={`rounded-lg px-3 py-1 text-sm ${
                inboxTab === "completed" ? "bg-[var(--accent)] text-white" : "border bg-white"
              }`}
            >
              Completed
            </button>
          </div>
        </div>
        {!status?.mailAutopilotReady && inboxTab === "pending" && (
          <p className="mt-2 text-sm text-amber-900">Connect mail (verified) to create and approve email drafts.</p>
        )}
        {inboxTab === "pending" && scheduleApproved.length > 0 && (
          <ul className="mt-3 space-y-2 rounded-lg border border-green-200 bg-green-50/50 p-3 text-sm">
            <li className="text-xs font-semibold uppercase text-green-900">From weekly plan (awaiting send below)</li>
            {scheduleApproved.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{t.title}</span>
                <button
                  type="button"
                  className="rounded border bg-white px-2 py-0.5 text-xs"
                  onClick={() => completeScheduleTask(t.id)}
                >
                  Mark done
                </button>
              </li>
            ))}
          </ul>
        )}
        {inboxTab === "pending" &&
          status?.mailAutopilotReady &&
          emails.length === 0 &&
          events.length === 0 &&
          scheduleApproved.length === 0 && (
          <p className="mt-2 text-sm text-[var(--muted)]">No pending drafts. Approve tasks on the weekly plan to land here.</p>
        )}
        {inboxTab === "completed" && (
          <div className="mt-3 space-y-3 text-sm">
            {completedItems.audit.length === 0 &&
            completedItems.scheduleTasks.length === 0 &&
            completedItems.automationTasks.length === 0 ? (
              <p className="text-[var(--muted)]">Nothing completed yet.</p>
            ) : (
              <>
                {completedItems.audit
                  .filter(
                    (e) =>
                      e.actionType === "mail.send_draft" ||
                      e.actionType === "calendar.send_event_invitation"
                  )
                  .map((e) => (
                  <div key={`${e.createdAt}-${e.target}`} className="rounded border bg-stone-50 px-3 py-2">
                    <p className="font-medium">{e.payloadSummary}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {e.actionType.replace(/\./g, " · ")} · {e.createdAt.slice(0, 19)}
                    </p>
                  </div>
                ))}
                {completedItems.scheduleTasks.map((t) => (
                  <div key={t.id} className="rounded border bg-stone-50 px-3 py-2">
                    <p className="font-medium">✓ {t.title}</p>
                    <p className="text-xs text-[var(--muted)]">Weekly plan task · {t.constituentName}</p>
                  </div>
                ))}
                {completedItems.automationTasks.map((t) => (
                  <div key={t.id} className="rounded border bg-stone-50 px-3 py-2">
                    <p className="font-medium">✓ {t.title}</p>
                    <p className="text-xs text-[var(--muted)]">Automation task</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        {inboxTab === "pending" && events.map((d) => (
          <div key={d.draftId} className="mt-4 rounded-lg border p-4 text-sm">
            <p className="font-medium">Calendar event · {d.subject}</p>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-stone-50 p-2 text-xs">
              {d.body ?? d.bodyPreview}
            </pre>
            <p className="mt-1 text-xs text-amber-800">Meeting invitations need your approval before they go out.</p>
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
        {inboxTab === "pending" && emails.map((d) => (
          <div key={d.draftId} className="mt-4 rounded-lg border p-4 text-sm">
            <p className="font-medium">Email → {(d.to ?? []).join(", ")}</p>
            <p className="text-[var(--muted)]">{d.subject}</p>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-stone-50 p-2 text-xs">
              {d.body ?? d.bodyPreview}
            </pre>
            <p className="mt-1 text-xs text-amber-800">Emails need your approval before they send.</p>
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
            disabled={!status?.mailAutopilotReady}
            onClick={createTask}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
          >
            + Weekly top-5 template
          </button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {tasks
            .filter((t) => t.status !== "completed" && t.status !== "cancelled")
            .map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded"
                  onChange={() => completeAutomationTask(t.id)}
                  aria-label={`Mark ${t.title} complete`}
                />
                <span>
                  {t.title} · <span className="text-[var(--muted)]">{t.status}</span>
                </span>
              </label>
              <button type="button" className="text-xs text-[var(--accent)]" onClick={() => runTask(t.id)}>
                Run now
              </button>
            </li>
          ))}
        </ul>
        {tasks.some((t) => t.status === "completed") && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Completed automation tasks appear under Approval inbox → Completed.
          </p>
        )}
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
