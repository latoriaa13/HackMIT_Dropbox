"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "donorex-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark =
      stored === "dark" ||
      (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", prefersDark);
    setDark(prefersDark);
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    setDark(next);
  };

  if (!mounted) {
    return (
      <span className="inline-block h-9 w-[4.5rem] rounded-full border border-[var(--border)] bg-[var(--surface)]" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-1 py-1 text-xs font-semibold shadow-xs"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      <span
        className={`rounded-full px-2.5 py-1 transition-colors ${!dark ? "bg-[var(--donorex-orange)] text-white" : "text-[var(--muted)]"}`}
      >
        Light
      </span>
      <span
        className={`rounded-full px-2.5 py-1 transition-colors ${dark ? "bg-[var(--donorex-navy)] text-white" : "text-[var(--muted)]"}`}
      >
        Dark
      </span>
    </button>
  );
}
