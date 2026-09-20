"use client";

import type { ReactNode } from "react";
import type { ConsentKind, MicrosoftAccountKind } from "@tuesday/m365";
import { markMicrosoftOAuthAttempt } from "@/lib/oauth-errors";
import { microsoftConnectHref } from "@/lib/m365-connect";

type Props = {
  returnTo?: string;
  consent: ConsentKind;
  label: string;
  variant?: "primary" | "secondary" | "social" | "signin";
  className?: string;
  children?: ReactNode;
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
  children,
  reauth = false,
  pickAccount = false,
  accountKind = "default",
}: Props) {
  const href = microsoftConnectHref(consent, returnTo, reauth, pickAccount, accountKind);
  const base =
    variant === "primary"
      ? "rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
      : variant === "social"
        ? "sign-in-social-btn"
        : variant === "signin"
          ? "sign-in-continue-btn"
          : "rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50";

  return (
    <a
      href={href}
      onClick={() => markMicrosoftOAuthAttempt()}
      className={`${variant === "social" || variant === "signin" ? "block w-full" : "inline-block"} ${base} ${className}`}
    >
      {children ?? label}
    </a>
  );
}
