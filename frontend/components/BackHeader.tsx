"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/ui/icons";

/**
 * Back-arrow header used on the detail screens (Gap detail, Learning plan,
 * Progress trends). `right` renders a trailing slot, e.g. a mastery badge.
 */
export function BackHeader({
  title,
  subtitle,
  right,
  fallbackHref = "/",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  fallbackHref?: string;
}) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }

  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={goBack}
        aria-label="Go back"
        className="mt-0.5 -ml-1 rounded-lg p-1 text-muted hover:bg-neutral-100 hover:text-foreground"
      >
        <ArrowLeftIcon />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
