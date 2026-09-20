"use client";

import { useEffect, useState } from "react";

/** Warn when dev server port ≠ NEXT_PUBLIC_APP_URL (breaks OAuth session cookies). */
export function DevPortWarning() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/m365/config-check")
      .then((r) => r.json())
      .then((d) => {
        const appUrl = d.appUrl as string | undefined;
        if (!appUrl || typeof window === "undefined") return;
        try {
          const expected = new URL(appUrl).port || "80";
          const actual = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
          const norm = (p: string) => (p === "80" || p === "443" ? "" : p);
          if (norm(expected) && norm(actual) && norm(expected) !== norm(actual)) {
            setMsg(
              `You're on port ${actual} but OAuth is configured for port ${norm(expected)} (${appUrl}). Open ${appUrl} or stop the other dev server and restart npm run dev.`
            );
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => null);
  }, []);

  if (!msg) return null;

  return (
    <div className="rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-950">
      <p className="font-semibold">Wrong localhost port — Outlook sign-in will not stick</p>
      <p className="mt-1">{msg}</p>
    </div>
  );
}
