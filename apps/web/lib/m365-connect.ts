import type { ConsentKind } from "@tuesday/m365";

export function safeReturnPath(path: string | null | undefined, fallback = "/"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  return path.split("?")[0] || fallback;
}

export function microsoftConnectHref(
  consent: ConsentKind = "full",
  returnTo = "/"
): string {
  const params = new URLSearchParams();
  if (consent !== "full") params.set("consent", consent);
  params.set("returnTo", safeReturnPath(returnTo));
  const q = params.toString();
  return q ? `/api/auth/microsoft/connect?${q}` : "/api/auth/microsoft/connect";
}
