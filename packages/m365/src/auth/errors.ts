export type ConsentErrorCode =
  | "consent_required"
  | "reauth_required"
  | "insufficient_scope"
  | "admin_consent_required"
  | "conditional_access"
  | "graph_error";

export class M365AuthError extends Error {
  constructor(
    message: string,
    public readonly code: ConsentErrorCode,
    public readonly missingScopes?: string[]
  ) {
    super(message);
    this.name = "M365AuthError";
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      missingScopes: this.missingScopes,
      consentUrl: "/api/auth/microsoft/connect",
    };
  }
}

export function isM365AuthError(e: unknown): e is M365AuthError {
  return e instanceof M365AuthError;
}
