import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/AppNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "DonoRex — Advancement action planner",
  description: "Where should your gift officers spend limited time this week?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-white font-sans text-slate-800 antialiased`}>
        <header className="w-full border-b border-slate-100 bg-white py-5 text-center shadow-xs">
          <Link href="/" className="inline-block">
            <span className="text-4xl font-extrabold tracking-wide text-[var(--donorex-orange)]">
              DonoRex
            </span>
            <span className="mt-1 block text-xs font-medium text-slate-500">
              Spend limited time where it matters
            </span>
          </Link>
        </header>
        <AppNav />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
