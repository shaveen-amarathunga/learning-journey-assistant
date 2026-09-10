"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/plan", label: "Plan" },
  { href: "/trends", label: "Trends" },
];

export function AppTopBar() {
  const pathname = usePathname();

  return (
    <header className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-3">
      <div className="flex min-w-0 items-center gap-5">
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold tracking-tight text-foreground"
        >
          Learning Journey Assistant
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {NAV.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "transition-colors",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <AccountMenu size="sm" />
    </header>
  );
}
