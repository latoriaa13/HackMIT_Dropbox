import { AppNav } from "@/components/AppNav";
import { AskRexChat } from "@/components/AskRexChat";
import { ProtectedAppShell } from "@/components/ProtectedAppShell";
import { requireMicrosoftAccountLinked } from "@/lib/onboarding-guard";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireMicrosoftAccountLinked();

  return (
    <>
      <AppNav />
      <ProtectedAppShell>
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
      </ProtectedAppShell>
      <AskRexChat />
    </>
  );
}
