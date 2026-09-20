import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";
import { SiteHeader } from "@/components/SiteHeader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "DonoRex — Advancement action planner",
  description: "Automated Donation Recommendations for advancement teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${inter.variable} min-h-screen bg-[var(--bg)] font-sans text-[var(--ink)] antialiased`}
      >
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
