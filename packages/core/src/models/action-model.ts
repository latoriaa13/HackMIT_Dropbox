import type { ActionType, Channel } from "./types";

export type EvidenceSignal = {
  code: string;
  label: string;
};

export type FundraisingAction = {
  id: string;
  constituentId: string;
  constituentName: string;
  actionType: ActionType;
  channel: Channel | "none";
  estimatedMinutes: number;
  conservativeOpportunity: number;
  expectedOpportunity: number;
  upsideOpportunity: number;
  confidence: number;
  relationshipFit: number;
  urgency: number;
  priorityScore: number;
  evidence: EvidenceSignal[];
  prerequisites: string[];
  exclusionReasons: string[];
  downstreamEffects: {
    retentionImpact?: number;
    recurringPotential?: number;
    pipelineImpact?: number;
  };
  whyNow: string;
  suggestedMessage: string;
  warning: string | null;
};

export const SOLICITATION_ACTIONS: ActionType[] = [
  "renewal_ask",
  "upgrade_ask",
  "recurring_gift_ask",
  "reactivation_email",
  "personal_call",
  "reunion_outreach",
];

export function isSolicitationAction(action: ActionType): boolean {
  return SOLICITATION_ACTIONS.includes(action);
}
