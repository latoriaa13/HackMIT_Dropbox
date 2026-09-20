"use client";

import { M365SessionProvider } from "@/components/M365SessionContext";

export function ProtectedAppShell({ children }: { children: React.ReactNode }) {
  return <M365SessionProvider>{children}</M365SessionProvider>;
}
