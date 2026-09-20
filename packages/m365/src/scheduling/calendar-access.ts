import { getMicrosoftAccount } from "../auth/account-store";
import { hasCalendarScopes } from "../auth/scopes";
import { Microsoft365NotConnectedError, Microsoft365PermissionError } from "../http/api-errors";

export function assertCalendarAccess(userId: string) {
  const account = getMicrosoftAccount(userId);
  if (!account) {
    throw new Microsoft365NotConnectedError();
  }
  if (!hasCalendarScopes(account.grantedScopes)) {
    throw new Microsoft365PermissionError(
      "Please connect your Outlook calendar first (use Connect calendar on the home page).",
      ["Calendars.Read"]
    );
  }
}
