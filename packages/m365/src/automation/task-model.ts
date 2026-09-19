import { z } from "zod";

export const PlannedActionSchema = z.object({
  type: z.enum([
    "draft_follow_up_emails",
    "find_meeting_slots",
    "create_call_reminder",
    "draft_thank_you",
  ]),
  constituentIds: z.array(z.string()).optional(),
  limit: z.number().optional(),
  templateId: z.string().optional(),
});

export const AutomationTaskSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  instruction: z.string(),
  trigger: z.discriminatedUnion("type", [
    z.object({ type: z.literal("once"), runAt: z.string() }),
    z.object({ type: z.literal("recurring"), cron: z.string() }),
    z.object({
      type: z.literal("event"),
      source: z.enum(["email", "calendar"]),
      description: z.string().optional(),
    }),
  ]),
  actions: z.array(PlannedActionSchema),
  status: z.enum([
    "draft",
    "awaiting_approval",
    "scheduled",
    "running",
    "completed",
    "failed",
    "cancelled",
    "paused",
  ]),
  requiresApproval: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastRunAt: z.string().optional(),
  nextRunAt: z.string().optional(),
  error: z.string().optional(),
});

export type AutomationTask = z.infer<typeof AutomationTaskSchema>;
export type PlannedAction = z.infer<typeof PlannedActionSchema>;

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1),
  instruction: z.string().min(1),
  templateId: z.enum([
    "weekly_top_opportunities",
    "find_meeting_slots",
    "event_thank_you",
    "manual_follow_up",
  ]),
  trigger: AutomationTaskSchema.shape.trigger,
  constituentIds: z.array(z.string()).optional(),
  requiresApproval: z.boolean().default(true),
});
