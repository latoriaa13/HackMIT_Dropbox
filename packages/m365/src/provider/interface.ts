import type {
  CalendarEvent,
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
} from "../schemas/m365-schemas";

export interface Microsoft365Provider {
  getConnectionStatus(): Promise<ConnectionStatus>;
  listUpcomingEvents(input: ListEventsInput): Promise<CalendarEvent[]>;
  findFreeSlots(input: FindFreeSlotsInput): Promise<FreeSlot[]>;
  createEventDraft(input: CreateEventInput): Promise<EventDraft>;
  sendEventInvitation(input: SendEventInput): Promise<SentEvent>;
  searchMessages(input: SearchMessagesInput): Promise<EmailMessage[]>;
  createEmailDraft(input: CreateEmailDraftInput): Promise<EmailDraft>;
  sendEmailDraft(input: SendEmailDraftInput): Promise<SentEmail>;
}
