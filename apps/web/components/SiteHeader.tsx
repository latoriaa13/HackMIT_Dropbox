import { DonoRexLogo } from "@/components/DonoRexLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="relative w-full border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-center shadow-xs sm:py-4">
      <div className="absolute right-4 top-3 sm:top-4">
        <ThemeToggle />
      </div>
      <DonoRexLogo />
      <p className="mt-1 text-xs font-medium tracking-wide text-[var(--muted)]">
        Automated Donation Recommendations
      </p>
    </header>
  );
}
