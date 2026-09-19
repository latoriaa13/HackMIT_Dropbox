export type ActionPolicy = "automatic" | "requires_approval" | "disabled";

const POLICIES: Record<string, ActionPolicy> = {
  "calendar.read": "automatic",
  "mail.search_metadata": "automatic",
  "mail.create_draft": "automatic",
  "calendar.create_event_draft": "automatic",
  "mail.send": "requires_approval",
  "mail.send_bulk": "requires_approval",
  "calendar.send_invitation": "requires_approval",
  "calendar.reschedule": "requires_approval",
  "calendar.delete": "requires_approval",
  "mailbox.delegate": "disabled",
};

export function getActionPolicy(actionKey: string): ActionPolicy {
  return POLICIES[actionKey] ?? "requires_approval";
}

export function requiresApproval(actionKey: string): boolean {
  return getActionPolicy(actionKey) === "requires_approval";
}
