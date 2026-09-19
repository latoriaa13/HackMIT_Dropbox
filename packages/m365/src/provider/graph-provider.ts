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
import { MockMicrosoft365Provider } from "./mock-provider";

function graphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

async function withGraph<T>(
  sessionUserId: string,
  scopeGroup: "user" | "calendar" | "mail",
  fn: (token: string) => Promise<T>
): Promise<T> {
  try {
    const token = await getGraphAccessToken(sessionUserId, scopeGroup);
    return await fn(token);
  } catch (e) {
    if (isM365AuthError(e)) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("401") || msg.includes("403")) {
      throw new M365AuthError("Microsoft Graph rejected this request — check consent.", "insufficient_scope");
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
      const res = await client
        .api("/me/calendarView")
        .query({ startDateTime: input.start, endDateTime: input.end })
        .get();
      return (res.value ?? []).map(
        (ev: {
          id: string;
          subject: string;
          start: { dateTime: string };
          end: { dateTime: string };
          location?: { displayName?: string };
        }) => ({
          id: ev.id,
          subject: ev.subject,
          start: ev.start.dateTime,
          end: ev.end.dateTime,
          timezone: input.timezone,
          location: ev.location?.displayName,
        })
      );
    });
  }

  async findFreeSlots(input: FindFreeSlotsInput): Promise<FreeSlot[]> {
    const events = await this.listUpcomingEvents({
      start: input.start,
      end: input.end,
      timezone: input.timezone,
    });
    const mock = new MockMicrosoft365Provider(this.sessionUserId);
    const candidates = await mock.findFreeSlots(input);
    return candidates.filter((slot) => {
      const s = new Date(slot.start).getTime();
      const e = new Date(slot.end).getTime();
      return !events.some((ev) => {
        const es = new Date(ev.start).getTime();
        const ee = new Date(ev.end).getTime();
        return s < ee && e > es;
      });
    });
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
    return withGraph(this.sessionUserId, "calendar", async (accessToken) => {
      const client = graphClient(accessToken);
      const created = await client.api("/me/events").post({
        subject: draft.subject,
        body: { contentType: "Text", content: draft.body },
        start: { dateTime: draft.start, timeZone: draft.timezone },
        end: { dateTime: draft.end, timeZone: draft.timezone },
        attendees: draft.attendees.map((email) => ({
          emailAddress: { address: email },
          type: "required",
        })),
      });
      removeEventDraft(input.draftId);
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
      const created = await client.api("/me/messages").post({
        subject: draft.subject,
        body: { contentType: "Text", content: draft.body },
        toRecipients: draft.to.map((address) => ({
          emailAddress: { address },
        })),
      });
      await client.api(`/me/messages/${created.id}/send`).post({});
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
        messageId: created.id,
        draftId: input.draftId,
        status: "sent_graph",
        message: "Email sent via Microsoft Graph.",
      };
    });
  }
}
