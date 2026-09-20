/** Guest work/school accounts often can't use Outlook calendar through Tuesday. */
export function isGuestExternalMicrosoftAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.includes("#EXT#") || email.toLowerCase().includes("#ext#");
}

export function guestExternalAccountMessage(): string {
  return "This looks like a guest work or school sign-in. Those accounts often don't include a full Outlook calendar in the way DonoRex needs. Try connecting with a personal Outlook.com account, or a work account your organization uses for email and calendar in Outlook.";
}

export function gmailInOutlookVsGraphMessage(): string {
  return "If you read Gmail inside the Outlook app, still sign in here with the Microsoft account shown when you open outlook.com in a browser — usually Personal for @outlook.com / @hotmail.com, or Work or school for your employer. DonoRex only sees the calendar tied to that Microsoft account, not a separate Gmail login.";
}
