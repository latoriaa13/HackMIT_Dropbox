"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type SharedM365Session = {
  connected: boolean;
  accountLinked?: boolean;
  outlookReady?: boolean;
  mailAutopilotReady?: boolean;
  calendarReady?: boolean;
  mailReady?: boolean;
  canStartOAuth?: boolean;
  configurationError?: boolean;
  missingCalendarConsent?: boolean;
  missingMailConsent?: boolean;
  connectUrl?: string;
  message?: string;
  email?: string;
  accountEmail?: string;
};

const M365SessionContext = createContext<{
  session: SharedM365Session | null;
  refresh: (verify?: boolean) => Promise<void>;
} | null>(null);

export function M365SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SharedM365Session | null>(null);

  const refresh = useCallback(async (verify = false) => {
    const q = verify ? "?verify=1" : "";
    const st = await fetch(`/api/auth/microsoft/session${q}`).then((r) => r.json());
    setSession(st);
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const value = useMemo(() => ({ session, refresh }), [session, refresh]);

  return <M365SessionContext.Provider value={value}>{children}</M365SessionContext.Provider>;
}

export function useM365Session() {
  return useContext(M365SessionContext);
}
