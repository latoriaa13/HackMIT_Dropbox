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
import { isM365Configured } from "../config/env";

export class MockMicrosoft365Provider implements Microsoft365Provider {
  constructor(private userId: string) {}

  async getConnectionStatus(): Promise<ConnectionStatus> {
    if (isM365Configured()) {
      return {
        connected: false,
        mode: "mock",
        accountEmail: null,
        accountName: null,
        grantedScopes: [],
        configured: true,
        message:
          "Preview mode — sign in with Microsoft 365 to use your real calendar and mailbox. Mock data is used until you connect.",
      };
    }
    return {
      connected: true,
      mode: "mock",
      accountEmail: "mock.user@givecampus-university.example",
      accountName: "Mock Gift Officer (dev preview)",
      grantedScopes: ["Mail.ReadWrite", "Calendars.ReadWrite", "Mail.Send"],
      configured: false,
      message:
        "Mock mode — no Microsoft 365 credentials configured. Nothing is sent to real mailboxes.",
    };
  }

  async listUpcomingEvents(input: ListEventsInput): Promise<CalendarEvent[]> {
    const start = new Date(input.start);
    return [
      {
        id: "mock-ev-1",
        subject: "Team stand-up (mock)",
        start: new Date(start.getTime() + 86400000).toISOString(),
        end: new Date(start.getTime() + 86400000 + 1800000).toISOString(),
        timezone: input.timezone,
        location: "Teams",
      },
    ];
  }

  async findFreeSlots(input: FindFreeSlotsInput): Promise<FreeSlot[]> {
    const slots: FreeSlot[] = [];
    const base = new Date(input.start);
    for (let d = 0; d < 5; d++) {
      for (const hour of [10, 14, 16]) {
        const s = new Date(base);
        s.setDate(s.getDate() + d);
        s.setHours(hour, 0, 0, 0);
        const e = new Date(s.getTime() + input.durationMinutes * 60000);
        slots.push({ start: s.toISOString(), end: e.toISOString(), timezone: input.timezone });
      }
    }
    return slots.slice(0, 9);
  }

  async createEventDraft(input: CreateEventInput): Promise<EventDraft> {
    const draft = createEventDraftRecord(this.userId, input, "mock");
    appendAudit({
      userId: this.userId,
      actionType: "calendar.create_event_draft",
      target: input.attendees.join(", "),
      status: "drafted",
      payloadSummary: `${input.subject} ${input.start}`,
    });
    const { body: _b, userId: _u, ...pub } = draft;
    return pub;
  }

  async sendEventInvitation(input: SendEventInput): Promise<SentEvent> {
    if (!verifyApprovalToken(input.draftId, input.approvalToken, "event", this.userId)) {
      throw new Error("Invalid or missing approval token");
    }
    const draft = getEventDraft(input.draftId, this.userId);
    if (!draft) throw new Error("Draft not found");
    removeEventDraft(input.draftId);
    appendAudit({
      userId: this.userId,
      actionType: "calendar.send_event_invitation",
      target: draft.attendees.join(", "),
      status: "executed",
      payloadSummary: `[MOCK] Sent invitation: ${draft.subject}`,
      executedAt: new Date().toISOString(),
    });
    return {
      eventId: `mock-sent-${input.draftId}`,
      draftId: input.draftId,
      status: "sent_mock",
      message:
        "Mock mode: invitation recorded in audit log only — not sent via Microsoft Graph.",
    };
  }

  async searchMessages(input: SearchMessagesInput): Promise<EmailMessage[]> {
    return [
      {
        id: "mock-msg-1",
        subject: `Re: ${input.query}`,
        receivedAt: new Date().toISOString(),
        from: "constituent@alumni.gcu.example",
        preview: "Mock search result preview (metadata only).",
      },
    ];
  }

  async createEmailDraft(input: CreateEmailDraftInput): Promise<EmailDraft> {
    const draft = createEmailDraftRecord(this.userId, input, "mock");
    appendAudit({
      userId: this.userId,
      actionType: "mail.create_draft",
      target: input.to.join(", "),
      status: "drafted",
      payloadSummary: input.subject,
    });
    const { body: _b, userId: _u, ...pub } = draft;
    return pub;
  }

  async sendEmailDraft(input: SendEmailDraftInput): Promise<SentEmail> {
    if (!verifyApprovalToken(input.draftId, input.approvalToken, "email", this.userId)) {
      throw new Error("Invalid or missing approval token");
    }
    const draft = getEmailDraft(input.draftId, this.userId);
    if (!draft) throw new Error("Draft not found");
    removeEmailDraft(input.draftId);
    appendAudit({
      userId: this.userId,
      actionType: "mail.send_draft",
      target: draft.to.join(", "),
      status: "executed",
      payloadSummary: `[MOCK] Sent: ${draft.subject}`,
      executedAt: new Date().toISOString(),
    });
    return {
      messageId: `mock-mail-${input.draftId}`,
      draftId: input.draftId,
      status: "sent_mock",
      message: "Mock mode: send recorded in audit log only — not sent via Microsoft Graph.",
    };
  }
}
