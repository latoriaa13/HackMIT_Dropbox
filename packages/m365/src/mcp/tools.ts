import type { Microsoft365Provider } from "../provider/interface";
import { requireMicrosoft365Provider } from "../provider/factory";
import {
  CreateEmailDraftInputSchema,
  CreateEventInputSchema,
  FindFreeSlotsInputSchema,
  ListEventsInputSchema,
  SearchMessagesInputSchema,
  SendEmailDraftInputSchema,
  SendEventInputSchema,
} from "../schemas/m365-schemas";

/** MCP-compatible tool registry — narrow, validated, no arbitrary Graph access. */
export const M365_MCP_TOOLS = [
  "m365.calendar.list_upcoming_events",
  "m365.calendar.find_free_slots",
  "m365.calendar.create_event_draft",
  "m365.calendar.send_event_invitation",
  "m365.mail.search_messages",
  "m365.mail.create_draft",
  "m365.mail.send_draft",
] as const;

export type M365ToolName = (typeof M365_MCP_TOOLS)[number];

export async function invokeM365Tool(
  provider: Microsoft365Provider,
  tool: M365ToolName,
  input: unknown
) {
  switch (tool) {
    case "m365.calendar.list_upcoming_events":
      return provider.listUpcomingEvents(ListEventsInputSchema.parse(input));
    case "m365.calendar.find_free_slots":
      return provider.findFreeSlots(FindFreeSlotsInputSchema.parse(input));
    case "m365.calendar.create_event_draft":
      return provider.createEventDraft(CreateEventInputSchema.parse(input));
    case "m365.calendar.send_event_invitation":
      return provider.sendEventInvitation(SendEventInputSchema.parse(input));
    case "m365.mail.search_messages":
      return provider.searchMessages(SearchMessagesInputSchema.parse(input));
    case "m365.mail.create_draft":
      return provider.createEmailDraft(CreateEmailDraftInputSchema.parse(input));
    case "m365.mail.send_draft":
      return provider.sendEmailDraft(SendEmailDraftInputSchema.parse(input));
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

/** Invoke an MCP tool using the authenticated user's Microsoft Graph session only. */
export async function invokeM365ToolForUser(
  sessionUserId: string,
  tool: M365ToolName,
  input: unknown
) {
  const provider = requireMicrosoft365Provider(sessionUserId);
  return invokeM365Tool(provider, tool, input);
}
