import type { Metadata } from "next";
import Link from "next/link";
import { ensureServerSession } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tuesday — Advancement action planner",
  description: "Where should your gift officers spend limited time this week?",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureServerSession();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="flex flex-col">
              <span className="text-xl font-semibold tracking-tight text-[var(--accent)]">
                Tuesday
              </span>
              <span className="text-xs text-[var(--muted)]">
                Spend limited time where it matters
              </span>
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm font-medium">
              <Link href="/" className="hover:text-[var(--accent)]">
                Weekly plan
              </Link>
              <Link href="/overview" className="hover:text-[var(--accent)]">
                Overview
              </Link>
              <Link href="/strategies" className="hover:text-[var(--accent)]">
                Strategies
              </Link>
              <Link href="/communities" className="hover:text-[var(--accent)]">
                Communities
              </Link>
              <Link href="/segments" className="hover:text-[var(--accent)]">
                Segments
              </Link>
              <Link href="/autopilot" className="hover:text-[var(--accent)]">
                Autopilot
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
