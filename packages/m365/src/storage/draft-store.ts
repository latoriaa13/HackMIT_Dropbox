import { randomUUID } from "node:crypto";
import type { EmailDraft, EventDraft } from "../schemas/m365-schemas";
import { draftsPath, readJsonFile, writeJsonFile } from "./json-store";

type DraftStore = {
  emailDrafts: Record<
    string,
    EmailDraft & { body: string; userId: string; relatedConstituentIds?: string[] }
  >;
  eventDrafts: Record<
    string,
    EventDraft & { body: string; userId: string; relatedConstituentIds?: string[] }
  >;
};

function load(): DraftStore {
  return readJsonFile(draftsPath(), { emailDrafts: {}, eventDrafts: {} });
}

function save(store: DraftStore) {
  writeJsonFile(draftsPath(), store);
}

export function createEmailDraftRecord(
  userId: string,
  input: { to: string[]; subject: string; body: string; relatedConstituentIds?: string[] },
  mode: "mock" | "microsoft_graph" = "mock"
): EmailDraft & { body: string; userId: string; relatedConstituentIds?: string[] } {
  const store = load();
  const draftId = randomUUID();
  const approvalToken = randomUUID();
  const draft: EmailDraft & { body: string; userId: string; relatedConstituentIds?: string[] } = {
    draftId,
    approvalToken,
    to: input.to,
    subject: input.subject,
    bodyPreview: input.body.slice(0, 280),
    status: "draft",
    mode,
    body: input.body,
    userId,
    relatedConstituentIds: input.relatedConstituentIds,
  };
  store.emailDrafts[draftId] = draft;
  save(store);
  return draft;
}

export function createEventDraftRecord(
  userId: string,
  input: CreateEventInputInternal,
  mode: "mock" | "microsoft_graph"
): EventDraft & { body: string; userId: string } {
  const store = load();
  const draftId = randomUUID();
  const approvalToken = randomUUID();
  const draft: EventDraft & { body: string; userId: string } = {
    draftId,
    approvalToken,
    subject: input.subject,
    start: input.start,
    end: input.end,
    timezone: input.timezone,
    attendees: input.attendees,
    bodyPreview: input.body.slice(0, 280),
    status: "draft",
    mode,
    body: input.body,
    userId,
  };
  store.eventDrafts[draftId] = draft;
  save(store);
  return draft;
}

type CreateEventInputInternal = {
  subject: string;
  start: string;
  end: string;
  timezone: string;
  attendees: string[];
  body: string;
};

export function getEmailDraft(draftId: string, userId: string) {
  const d = load().emailDrafts[draftId];
  if (!d || d.userId !== userId) return null;
  return d;
}

export function getEventDraft(draftId: string, userId: string) {
  const d = load().eventDrafts[draftId];
  if (!d || d.userId !== userId) return null;
  return d;
}

export function verifyApprovalToken(
  draftId: string,
  approvalToken: string,
  kind: "email" | "event",
  userId: string
): boolean {
  const draft =
    kind === "email" ? getEmailDraft(draftId, userId) : getEventDraft(draftId, userId);
  return draft?.approvalToken === approvalToken;
}

export function removeEmailDraft(draftId: string) {
  const store = load();
  delete store.emailDrafts[draftId];
  save(store);
}

export function removeEventDraft(draftId: string) {
  const store = load();
  delete store.eventDrafts[draftId];
  save(store);
}

export function listPendingDrafts(userId: string) {
  const store = load();
  return {
    emails: Object.values(store.emailDrafts).filter((d) => d.userId === userId),
    events: Object.values(store.eventDrafts).filter((d) => d.userId === userId),
  };
}
