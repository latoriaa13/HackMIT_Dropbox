import { Client } from "@microsoft/microsoft-graph-client";
import type { Microsoft365Provider } from "./interface";
import type {
  ConnectionStatus,
  CreateEmailDraftInput,
  CreateEventInput,
  EmailDraft,
  EmailMessage,
  EventDraft,
  FindFreeSlotsInput,
  FreeSlot,
  ListEventsInput,
  SearchMessagesInput,
  SendEmailDraftInput,
  SendEventInput,
  SentEmail,
  SentEvent,
  CalendarEvent,
} from "../schemas/m365-schemas";
import { getMicrosoftAccount } from "../auth/account-store";
import { getGraphAccessToken } from "../auth/ms-token-service";
import { isM365AuthError, M365AuthError } from "../auth/errors";
import {
  createEmailDraftRecord,
  createEventDraftRecord,
  getEmailDraft,
  getEventDraft,
  removeEmailDraft,
  removeEventDraft,
  verifyApprovalToken,
} from "../storage/draft-store";
import { appendAudit } from "../storage/audit-log";
import { computeFreeSlots } from "../calendar/compute-free-slots";
import { completeScheduleTaskByOutlookDraft } from "../scheduling/schedule-task-approve";
import { wallClockInZoneToUtcIso, assertIanaZone } from "@tuesday/core";
import { windowsTimeZoneToIana, getOutlookTimeZoneContext } from "../calendar/outlook-timezone";
import { DateTime } from "luxon";
import { M365_SCOPES_CALENDAR, M365_SCOPES_MAIL } from "../auth/scopes";
import { CONNECTION_COPY, scopeMissingMessage } from "../auth/user-connection-messages";

function graphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

function utcIsoToGraphLocalDateTime(utcIso: string, ianaZone: string): string {
  const zone = assertIanaZone(ianaZone);
  return DateTime.fromISO(utcIso, { zone: "utc" }).setZone(zone).toFormat("yyyy-MM-dd'T'HH:mm:ss");
}

async function withGraph<T>(
  sessionUserId: string,
  scopeGroup: "user" | "calendar" | "mail",
  fn: (token: string) => Promise<T>
): Promise<T> {
  try {
    let token = await getGraphAccessToken(sessionUserId, scopeGroup);
    try {
      return await fn(token);
    } catch (inner) {
      const msg = inner instanceof Error ? inner.message : String(inner);
      if (msg.includes("401") || msg.toLowerCase().includes("invalidauthenticationtoken")) {
        token = await getGraphAccessToken(sessionUserId, scopeGroup, { forceRefresh: true });
        return await fn(token);
      }
      throw inner;
    }
  } catch (e) {
    if (isM365AuthError(e)) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("401")) {
      throw new M365AuthError(CONNECTION_COPY.signInExpired, "reauth_required");
    }
    if (msg.includes("403")) {
      const missingScopes =
        scopeGroup === "calendar"
          ? [...M365_SCOPES_CALENDAR]
          : scopeGroup === "mail"
            ? [...M365_SCOPES_MAIL]
            : [];
      const message =
        scopeGroup === "calendar"
          ? scopeMissingMessage("calendar")
          : scopeGroup === "mail"
            ? scopeMissingMessage("mail")
            : CONNECTION_COPY.signInExpired;
      throw new M365AuthError(message, "insufficient_scope", missingScopes);
    }
    throw new M365AuthError(msg, "graph_error");
  }
}

export class MicrosoftGraphProvider implements Microsoft365Provider {
  constructor(private sessionUserId: string) {}

  async getConnectionStatus(): Promise<ConnectionStatus> {
    const account = getMicrosoftAccount(this.sessionUserId);
    if (!account) {
      return {
        connected: false,
        mode: "microsoft_graph",
        accountEmail: null,
        accountName: null,
        grantedScopes: [],
        configured: true,
        message: "Connect Microsoft 365 to enable Autopilot.",
      };
    }
    return {
      connected: true,
      mode: "microsoft_graph",
      accountEmail: account.email,
      accountName: account.displayName,
      grantedScopes: account.grantedScopes,
      configured: true,
    };
  }

  async listUpcomingEvents(input: ListEventsInput): Promise<CalendarEvent[]> {
    return withGraph(this.sessionUserId, "calendar", async (accessToken) => {
      const client = graphClient(accessToken);
      const preferTz = input.outlookTimeZone ?? "UTC";
      const res = await client
        .api("/me/calendarView")
        .header("Prefer", `outlook.timezone="${preferTz}"`)
        .query({ startDateTime: input.start, endDateTime: input.end })
        .get();
      return (res.value ?? []).map(
        (ev: {
          id: string;
          subject: string;
          start: { dateTime: string; timeZone?: string };
          end: { dateTime: string; timeZone?: string };
          location?: { displayName?: string };
          isAllDay?: boolean;
          showAs?: string;
          sensitivity?: string;
          attendees?: unknown[];
        }) => {
          const isPrivate =
            ev.sensitivity === "private" ||
            ev.sensitivity === "confidential" ||
            ev.sensitivity === "personal";
          const subject = isPrivate ? "Busy / private event" : ev.subject || "Busy";
          const startZone = ev.start.timeZone
            ? windowsTimeZoneToIana(ev.start.timeZone)
            : input.timezone;
          const endZone = ev.end.timeZone ? windowsTimeZoneToIana(ev.end.timeZone) : input.timezone;
          return {
            id: ev.id,
            subject,
            start: wallClockInZoneToUtcIso(ev.start.dateTime, startZone),
            end: wallClockInZoneToUtcIso(ev.end.dateTime, endZone),
            timezone: input.timezone,
            location: isPrivate ? undefined : ev.location?.displayName,
            isAllDay: ev.isAllDay,
            showAs: ev.showAs,
            sensitivity: ev.sensitivity,
            isPrivate,
            attendeeCount: Array.isArray(ev.attendees) ? ev.attendees.length : undefined,
          };
        }
      );
    });
  }

  async findFreeSlots(input: FindFreeSlotsInput): Promise<FreeSlot[]> {
    const events = await this.listUpcomingEvents({
      start: input.start,
      end: input.end,
      timezone: input.timezone,
    });
    return computeFreeSlots(input, events);
  }

  async createEventDraft(input: CreateEventInput): Promise<EventDraft> {
    await getGraphAccessToken(this.sessionUserId, "calendar");
    const draft = createEventDraftRecord(this.sessionUserId, input, "microsoft_graph");
    appendAudit({
      userId: this.sessionUserId,
      actionType: "calendar.create_event_draft",
      target: input.attendees.join(", "),
      status: "drafted",
      payloadSummary: input.subject,
    });
    const { body: _b, userId: _u, ...pub } = draft;
    return pub;
  }

  async sendEventInvitation(input: SendEventInput): Promise<SentEvent> {
    if (!verifyApprovalToken(input.draftId, input.approvalToken, "event", this.sessionUserId)) {
      throw new Error("Approval required");
    }
    const draft = getEventDraft(input.draftId, this.sessionUserId);
    if (!draft) throw new Error("Draft not found");
    const { windows: outlookWindows } = await getOutlookTimeZoneContext(this.sessionUserId);
    const graphTz = draft.timezone.includes("/") ? outlookWindows : draft.timezone;
    const startLocal = utcIsoToGraphLocalDateTime(draft.start, draft.timezone);
    const endLocal = utcIsoToGraphLocalDateTime(draft.end, draft.timezone);
    return withGraph(this.sessionUserId, "calendar", async (accessToken) => {
      const client = graphClient(accessToken);
      const created = await client.api("/me/events").post({
        subject: draft.subject,
        body: { contentType: "Text", content: draft.body },
        start: { dateTime: startLocal, timeZone: graphTz },
        end: { dateTime: endLocal, timeZone: graphTz },
        attendees: draft.attendees.map((email) => ({
          emailAddress: { address: email },
          type: "required",
        })),
      });
      removeEventDraft(input.draftId);
      completeScheduleTaskByOutlookDraft(this.sessionUserId, input.draftId);
      appendAudit({
        userId: this.sessionUserId,
        actionType: "calendar.send_event_invitation",
        target: draft.attendees.join(", "),
        status: "executed",
        payloadSummary: draft.subject,
        executedAt: new Date().toISOString(),
      });
      return {
        eventId: created.id,
        draftId: input.draftId,
        status: "sent_graph",
        message: "Calendar event created on your calendar; invitations sent to attendees.",
      };
    });
  }

  async searchMessages(input: SearchMessagesInput): Promise<EmailMessage[]> {
    return withGraph(this.sessionUserId, "mail", async (accessToken) => {
      const client = graphClient(accessToken);
      const res = await client.api("/me/messages").search(`"${input.query}"`).top(input.top).get();
      return (res.value ?? []).map(
        (m: {
          id: string;
          subject: string;
          receivedDateTime: string;
          from?: { emailAddress?: { address?: string } };
          bodyPreview?: string;
        }) => ({
          id: m.id,
          subject: m.subject,
          receivedAt: m.receivedDateTime,
          from: m.from?.emailAddress?.address ?? "",
          preview: (m.bodyPreview ?? "").slice(0, 200),
        })
      );
    });
  }

  async createEmailDraft(input: CreateEmailDraftInput): Promise<EmailDraft> {
    await getGraphAccessToken(this.sessionUserId, "mail");
    const draft = createEmailDraftRecord(this.sessionUserId, input, "microsoft_graph");
    appendAudit({
      userId: this.sessionUserId,
      actionType: "mail.create_draft",
      target: input.to.join(", "),
      status: "drafted",
      payloadSummary: input.subject,
    });
    const { body: _b, userId: _u, ...pub } = draft;
    return pub;
  }

  async sendEmailDraft(input: SendEmailDraftInput): Promise<SentEmail> {
    if (!verifyApprovalToken(input.draftId, input.approvalToken, "email", this.sessionUserId)) {
      throw new Error("Approval required");
    }
    const draft = getEmailDraft(input.draftId, this.sessionUserId);
    if (!draft) throw new Error("Draft not found");
    return withGraph(this.sessionUserId, "mail", async (accessToken) => {
      const client = graphClient(accessToken);
      await client.api("/me/sendMail").post({
        message: {
          subject: draft.subject,
          body: { contentType: "Text", content: draft.body },
          toRecipients: draft.to.map((address) => ({
            emailAddress: { address },
          })),
        },
        saveToSentItems: true,
      });
      removeEmailDraft(input.draftId);
      appendAudit({
        userId: this.sessionUserId,
        actionType: "mail.send_draft",
        target: draft.to.join(", "),
        status: "executed",
        payloadSummary: draft.subject,
        executedAt: new Date().toISOString(),
      });
      return {
        messageId: "sendMail",
        draftId: input.draftId,
        status: "sent_graph",
        message: `Email sent to ${draft.to.join(", ")} via Microsoft Graph. Check Sent Items in Outlook and the recipient inbox (including spam).`,
      };
    });
  }
}
