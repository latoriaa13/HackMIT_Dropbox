import { z } from "zod";

export const ConnectionStatusSchema = z.object({
  connected: z.boolean(),
  mode: z.literal("microsoft_graph"),
  accountEmail: z.string().nullable(),
  accountName: z.string().nullable(),
  grantedScopes: z.array(z.string()),
  configured: z.boolean(),
  message: z.string().optional(),
});
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const ListEventsInputSchema = z.object({
  start: z.string(),
  end: z.string(),
  timezone: z.string().default("America/New_York"),
  /** Windows timezone for Prefer: outlook.timezone (from mailbox settings). */
  outlookTimeZone: z.string().optional(),
});
export type ListEventsInput = z.infer<typeof ListEventsInputSchema>;

export const CalendarEventSchema = z.object({
  id: z.string(),
  subject: z.string(),
  start: z.string(),
  end: z.string(),
  timezone: z.string(),
  location: z.string().optional(),
  isAllDay: z.boolean().optional(),
  showAs: z.string().optional(),
  sensitivity: z.string().optional(),
  isPrivate: z.boolean().optional(),
  attendeeCount: z.number().optional(),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const CalendarWeekQuerySchema = z.object({
  weekStart: z.string().optional(),
  timezone: z.string().default("America/New_York"),
});
export type CalendarWeekQuery = z.infer<typeof CalendarWeekQuerySchema>;

export const FindFreeSlotsInputSchema = z.object({
  start: z.string(),
  end: z.string(),
  durationMinutes: z.number().min(15).max(240),
  timezone: z.string().default("America/New_York"),
  workingHoursStart: z.number().default(9),
  workingHoursEnd: z.number().default(17),
});
export type FindFreeSlotsInput = z.infer<typeof FindFreeSlotsInputSchema>;

export const FreeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
  timezone: z.string(),
});
export type FreeSlot = z.infer<typeof FreeSlotSchema>;

export const CreateEventInputSchema = z.object({
  subject: z.string().min(1),
  start: z.string(),
  end: z.string(),
  timezone: z.string(),
  location: z.string().optional(),
  attendees: z.array(z.string().email()).max(10),
  body: z.string(),
  relatedConstituentIds: z.array(z.string()).optional(),
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

export const EventDraftSchema = z.object({
  draftId: z.string(),
  approvalToken: z.string(),
  subject: z.string(),
  start: z.string(),
  end: z.string(),
  timezone: z.string(),
  attendees: z.array(z.string()),
  bodyPreview: z.string(),
  status: z.literal("draft"),
  mode: z.literal("microsoft_graph"),
});
export type EventDraft = z.infer<typeof EventDraftSchema>;

export const SendEventInputSchema = z.object({
  draftId: z.string(),
  approvalToken: z.string(),
});
export type SendEventInput = z.infer<typeof SendEventInputSchema>;

export const SentEventSchema = z.object({
  eventId: z.string(),
  draftId: z.string(),
  status: z.literal("sent_graph"),
  message: z.string(),
});
export type SentEvent = z.infer<typeof SentEventSchema>;

export const SearchMessagesInputSchema = z.object({
  query: z.string().min(1),
  top: z.number().min(1).max(25).default(10),
});
export type SearchMessagesInput = z.infer<typeof SearchMessagesInputSchema>;

export const EmailMessageSchema = z.object({
  id: z.string(),
  subject: z.string(),
  receivedAt: z.string(),
  from: z.string(),
  preview: z.string(),
});
export type EmailMessage = z.infer<typeof EmailMessageSchema>;

export const CreateEmailDraftInputSchema = z.object({
  to: z.array(z.string().email()).min(1).max(5),
  subject: z.string().min(1),
  body: z.string().min(1),
  relatedConstituentIds: z.array(z.string()).optional(),
});
export type CreateEmailDraftInput = z.infer<typeof CreateEmailDraftInputSchema>;

export const EmailDraftSchema = z.object({
  draftId: z.string(),
  approvalToken: z.string(),
  to: z.array(z.string()),
  subject: z.string(),
  bodyPreview: z.string(),
  status: z.literal("draft"),
  mode: z.literal("microsoft_graph"),
});
export type EmailDraft = z.infer<typeof EmailDraftSchema>;

export const SendEmailDraftInputSchema = z.object({
  draftId: z.string(),
  approvalToken: z.string(),
});
export type SendEmailDraftInput = z.infer<typeof SendEmailDraftInputSchema>;

export const SentEmailSchema = z.object({
  messageId: z.string(),
  draftId: z.string(),
  status: z.literal("sent_graph"),
  message: z.string(),
});
export type SentEmail = z.infer<typeof SentEmailSchema>;
