/** B2B guest identities (email#EXT#@tenant) usually have no Exchange/Outlook mailbox for Graph. */
export function isGuestExternalMicrosoftAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.includes("#EXT#") || email.toLowerCase().includes("#ext#");
}

export function guestExternalAccountMessage(): string {
  return "You are signed in as a guest (work/school) user — the #EXT# address. That Azure identity is not the same as “Gmail shown inside Outlook.” Events you created after adding Gmail to Outlook often live in Google Calendar or a connected feed; Tuesday uses Microsoft Graph and only sees the Microsoft-hosted mailbox for the account you chose at sign-in.";
}

/** Shown when user expects Gmail calendar events to appear via Graph. */
export function gmailInOutlookVsGraphMessage(): string {
  return "If you use Gmail in the Outlook app: open outlook.com in a browser and note which Microsoft account is signed in (Personal vs Work/school). Connect Tuesday with that same account type. Work/school guest (#EXT#) accounts need an Exchange Online mailbox in Azure before Graph can read calendar — adding Gmail to Outlook does not create that mailbox.";
}
