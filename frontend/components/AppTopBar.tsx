"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import {
  fetchSubjects,
  getCurrentSubjectCode,
  setSelectedSubjectCode,
  type SubjectOption,
} from "@/lib/api";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/plan", label: "Plan" },
  { href: "/trends", label: "Trends" },
];

export function AppTopBar() {
  const pathname = usePathname();

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  // Read the saved subject from localStorage after hydration. Changing it
  // reloads the app, so there is nothing to subscribe to.
  const selectedSubject = useSyncExternalStore(
    () => () => {},
    getCurrentSubjectCode,
    () => "",
  );

  useEffect(() => {
    fetchSubjects()
      .then(setSubjects)
      .catch((error) => {
        console.error("Unable to load subjects:", error);
      });
  }, []);

  function handleSubjectChange(subjectCode: string) {
    setSelectedSubjectCode(subjectCode);

    window.location.assign("/");
  }

  return (
    <header className="mb-8 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3 min-[360px]:px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="hidden shrink-0 text-sm font-semibold tracking-tight text-foreground sm:block"
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

        <div className="flex items-center gap-3">
          {subjects.length > 0 && (
            <select
              aria-label="Select subject"
              value={selectedSubject}
              onChange={(event) =>
                handleSubjectChange(event.target.value)
              }
              className="max-w-[220px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none"
            >
              {subjects.map((subject) => (
                <option key={subject.code} value={subject.code}>
                  {subject.code} — {subject.name}
                </option>
              ))}
            </select>
          )}

          <AccountMenu size="sm" />
        </div>
      </div>
    </header>
  );
}
