"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MicrosoftPermissionConnect } from "@/components/MicrosoftPermissionConnect";
import { consumeMicrosoftOAuthReturn, formatOAuthReturnMessage } from "@/lib/oauth-errors";
import { GoogleIcon, OutlookIcon } from "@/components/SignInProviderIcons";

type WelcomeStatus = {
  configurationError?: boolean;
};

const RETURN_PATH = "/welcome";

function SignInOr() {
  return <div className="sign-in-or">Or</div>;
}

function isOAuthReturn(params: URLSearchParams): boolean {
  return (
    params.has("connected") ||
    params.has("calendar_connected") ||
    params.has("mail_connected") ||
    params.has("error")
  );
}

async function signOutOnWelcome() {
  await Promise.all([
    fetch("/api/auth/microsoft/disconnect", { method: "POST" }),
    fetch("/api/auth/onboarding/reset", { method: "POST" }),
  ]);
}

export function WelcomeLoginScreen() {
  const router = useRouter();
  const bootstrapped = useRef(false);
  const [status, setStatus] = useState<WelcomeStatus | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");

  const loadConfig = useCallback(async () => {
    const st = await fetch("/api/m365/status").then((r) => r.json());
    setStatus({ configurationError: st.configurationError });
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const oauthReturn = isOAuthReturn(params);

      if (!oauthReturn) {
        await signOutOnWelcome();
        setBanner(null);
        await loadConfig();
        setReady(true);
        return;
      }

      for (const key of ["connected", "calendar_connected", "mail_connected", "error"] as const) {
        const val = params.get(key);
        if (!val && key !== "error") continue;

        if (key === "error" && val && consumeMicrosoftOAuthReturn()) {
          setBanner({ type: "err", text: formatOAuthReturnMessage(val) });
          window.history.replaceState({}, "", RETURN_PATH);
          await signOutOnWelcome();
          await loadConfig();
          setReady(true);
          break;
        }

        if (key !== "error" && val && consumeMicrosoftOAuthReturn()) {
          window.history.replaceState({}, "", RETURN_PATH);
          const st = await fetch("/api/m365/status?verify=1").then((r) => r.json());
          const signedInOk = st.outlookReady || st.mailAutopilotReady || st.accountLinked;
          if (signedInOk) {
            await fetch("/api/auth/onboarding/complete", { method: "POST" });
            router.replace("/");
            router.refresh();
            return;
          }
          setBanner({
            type: "err",
            text: "We couldn't finish Outlook sign-in. Try again and choose Allow on each Microsoft prompt.",
          });
          await signOutOnWelcome();
          await loadConfig();
          setReady(true);
          break;
        }
      }
    })();
  }, [loadConfig, router]);

  const st = status ?? {};

  return (
    <div className="w-full max-w-[400px]">
      <h1 className="text-[1.75rem] font-semibold tracking-tight text-[var(--ink)]">Sign in</h1>

      {banner && (
        <p
          className={`mt-4 rounded-lg px-3 py-2.5 text-sm ${
            banner.type === "ok"
              ? "border border-green-200 bg-green-50 text-green-950"
              : "border border-red-200 bg-red-50 text-red-950"
          }`}
        >
          {banner.text}
        </p>
      )}

      {!ready && <p className="mt-6 text-sm text-[var(--muted)]">Preparing sign-in…</p>}

      {ready && (
        <div className="mt-8">
          {st.configurationError ? (
            <p className="mb-4 text-sm text-red-700">Microsoft sign-in is not configured for this app yet.</p>
          ) : (
            <MicrosoftPermissionConnect
              consent="full"
              returnTo={RETURN_PATH}
              label="Continue with Outlook"
              variant="social"
              accountKind="personal"
            >
              <OutlookIcon />
              Continue with Outlook
            </MicrosoftPermissionConnect>
          )}

          <SignInOr />

          <button type="button" disabled className="sign-in-social-btn sign-in-social-btn--disabled">
            <GoogleIcon />
            Continue with Google
          </button>
          <p className="mt-1.5 text-center text-xs text-[var(--muted)]">Google sign-in coming soon</p>

          <SignInOr />

          <label className="sr-only" htmlFor="sign-in-email">
            Email address
          </label>
          <input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            disabled
            className="sign-in-email-input"
          />
          <button
            type="button"
            disabled
            className="sign-in-continue-btn mt-3 disabled:cursor-not-allowed disabled:opacity-45"
            title="Email sign-in coming soon — use Outlook for now"
          >
            Continue
          </button>
          <p className="mt-2 text-center text-xs text-[var(--muted)]">
            Email sign-in coming soon — use Outlook to connect calendar and mail today.
          </p>
        </div>
      )}
    </div>
  );
}
