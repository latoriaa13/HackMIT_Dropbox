import { isM365AuthError, M365AuthError } from "../auth/errors";

export class Microsoft365NotConnectedError extends Error {
  readonly code = "MICROSOFT365_NOT_CONNECTED" as const;
  readonly connectUrl = "/api/auth/microsoft/connect";

  constructor(message = "Connect your Microsoft Outlook account to use this feature.") {
    super(message);
    this.name = "Microsoft365NotConnectedError";
  }

  toJSON() {
    return { code: this.code, message: this.message, connectUrl: this.connectUrl };
  }
}

export class Microsoft365ConfigurationError extends Error {
  readonly code = "MICROSOFT365_CONFIGURATION_ERROR" as const;

  constructor(message = "Tuesday isn't set up for Microsoft sign-in yet.") {
    super(message);
    this.name = "Microsoft365ConfigurationError";
  }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}

export class Microsoft365CalendarSyncError extends Error {
  readonly code = "MICROSOFT365_CALENDAR_SYNC_FAILED" as const;

  constructor(
    message = "We couldn't load this week's meetings from Outlook. You're still signed in — try Refresh calendar again."
  ) {
    super(message);
    this.name = "Microsoft365CalendarSyncError";
  }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}

export class Microsoft365PermissionError extends Error {
  readonly code = "MICROSOFT365_PERMISSION_ERROR" as const;

  constructor(
    message = "We need your permission to access Outlook. Please connect again and choose Allow.",
    public readonly requiredScopes: string[] = []
  ) {
    super(message);
    this.name = "Microsoft365PermissionError";
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      requiredScopes: this.requiredScopes,
      connectUrl: "/api/auth/microsoft/connect",
    };
  }
}

export type Microsoft365ApiError =
  | Microsoft365NotConnectedError
  | Microsoft365ConfigurationError
  | Microsoft365CalendarSyncError
  | Microsoft365PermissionError;

export function isMicrosoft365ApiError(e: unknown): e is Microsoft365ApiError {
  return (
    e instanceof Microsoft365NotConnectedError ||
    e instanceof Microsoft365ConfigurationError ||
    e instanceof Microsoft365CalendarSyncError ||
    e instanceof Microsoft365PermissionError
  );
}

export function m365ErrorToHttpResponse(e: unknown): { status: number; body: Record<string, unknown> } {
  if (e instanceof Microsoft365NotConnectedError) {
    return { status: 401, body: e.toJSON() };
  }
  if (e instanceof Microsoft365ConfigurationError) {
    return { status: 503, body: e.toJSON() };
  }
  if (e instanceof Microsoft365PermissionError) {
    return { status: 403, body: e.toJSON() };
  }
  if (e instanceof Microsoft365CalendarSyncError) {
    return { status: 422, body: e.toJSON() };
  }
  if (isM365AuthError(e)) {
    if (e.code === "insufficient_scope" || e.code === "consent_required") {
      const msg =
        e.message?.trim() ||
        "Please connect your calendar and choose Allow when Microsoft asks to view your calendar.";
      const perm = new Microsoft365PermissionError(msg, e.missingScopes ?? []);
      return { status: 403, body: perm.toJSON() };
    }
    if (e.code === "reauth_required") {
      const notConn = new Microsoft365NotConnectedError(e.message);
      return { status: 401, body: notConn.toJSON() };
    }
    if (e.code === "graph_error") {
      const notConn = new Microsoft365NotConnectedError(
        e.message || "Your Microsoft sign-in expired. Disconnect, then connect again."
      );
      return { status: 401, body: notConn.toJSON() };
    }
    return { status: 403, body: { code: "MICROSOFT365_PERMISSION_ERROR", message: e.message } };
  }
  return {
    status: 400,
    body: { code: "MICROSOFT365_ERROR", message: e instanceof Error ? e.message : "Request failed" },
  };
}
