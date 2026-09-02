import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { masteryStatus } from "@/lib/format";

const tones = {
  low: "bg-red-50 text-status-low",
  mid: "bg-amber-50 text-status-mid",
  high: "bg-green-50 text-status-high",
  neutral: "bg-neutral-100 text-muted",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MasteryBadge({ value }: { value: number }) {
  return <Badge tone={masteryStatus(value)}>{value}% mastery</Badge>;
}
