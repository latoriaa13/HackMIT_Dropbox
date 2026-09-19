/**
 * Microsoft Graph change notification adapter (placeholder).
 * Production: POST /api/webhooks/microsoft with validationToken handshake,
 * lifecycle events at /api/webhooks/microsoft/lifecycle.
 * MVP: use manual "Run now" on tasks or polling fallback documented in README.
 */
export type GraphSubscription = {
  id: string;
  resource: "/me/messages" | "/me/events";
  expirationDateTime: string;
};

export function webhookSetupInstructions(): string {
  return "Webhook subscriptions require a public HTTPS URL. Use task polling or Run now in local dev.";
}
