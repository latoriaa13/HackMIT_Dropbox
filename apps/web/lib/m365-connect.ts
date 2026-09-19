import type { ConsentKind, MicrosoftAccountKind } from "@tuesday/m365";

export function safeReturnPath(path: string | null | undefined, fallback = "/"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  return path.split("?")[0] || fallback;
}

export function microsoftConnectHref(
  consent: ConsentKind = "full",
  returnTo = "/",
  reauth = false,
  pickAccount = false,
  accountKind: MicrosoftAccountKind = "default"
): string {
  const params = new URLSearchParams();
  if (consent !== "full") params.set("consent", consent);
  params.set("returnTo", safeReturnPath(returnTo));
  if (reauth) params.set("reauth", "1");
  if (pickAccount) params.set("pickAccount", "1");
  if (accountKind !== "default") params.set("accountKind", accountKind);
  return `/api/auth/microsoft/connect?${params.toString()}`;
}
