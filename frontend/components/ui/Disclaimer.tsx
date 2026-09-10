import type { ReactNode } from "react";
import { InfoIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * A quiet, muted note — used for provenance and the "formative estimate,
 * not an official grade" line the brief requires.
 */
export function Disclaimer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("flex items-start gap-2 text-xs text-muted", className)}>
      <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
