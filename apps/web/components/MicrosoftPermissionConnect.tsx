"use client";

import type { ConsentKind, MicrosoftAccountKind } from "@tuesday/m365";
import { markMicrosoftOAuthAttempt } from "@/lib/oauth-errors";
import { microsoftConnectHref } from "@/lib/m365-connect";

type Props = {
  returnTo?: string;
  consent: ConsentKind;
  label: string;
  variant?: "primary" | "secondary";
  className?: string;
  reauth?: boolean;
  pickAccount?: boolean;
  accountKind?: MicrosoftAccountKind;
};

export function MicrosoftPermissionConnect({
  returnTo = "/",
  consent,
  label,
  variant = "secondary",
  className = "",
  reauth = false,
  pickAccount = false,
  accountKind = "default",
}: Props) {
  const href = microsoftConnectHref(consent, returnTo, reauth, pickAccount, accountKind);
  const base =
    variant === "primary"
      ? "rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
      : "rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50";

  return (
    <a
      href={href}
      onClick={() => markMicrosoftOAuthAttempt()}
      className={`inline-block ${base} ${className}`}
    >
      {label}
    </a>
  );
}
