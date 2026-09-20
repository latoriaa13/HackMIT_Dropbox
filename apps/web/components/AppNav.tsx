"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Weekly plan" },
  { href: "/overview", label: "Overview" },
  { href: "/strategies", label: "Strategies" },
  { href: "/communities", label: "Communities" },
  { href: "/segments", label: "Segments" },
  { href: "/autopilot", label: "Autopilot" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4">
        <ul className="flex flex-wrap items-center justify-center gap-4 py-3 text-sm font-bold text-[var(--donorex-navy)] sm:gap-8">
          {LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group relative block whitespace-nowrap px-1 py-1 transition-colors ${
                    active ? "text-[var(--donorex-orange)]" : "hover:text-[var(--donorex-orange)]"
                  }`}
                >
                  {label}
                  <span
                    className={`absolute bottom-0 left-0 h-0.5 w-full origin-center bg-[var(--donorex-orange)] transition-transform duration-300 ease-out ${
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
