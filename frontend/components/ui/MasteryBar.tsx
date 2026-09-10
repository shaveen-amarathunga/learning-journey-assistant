import { masteryColor, masteryTextClass } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * A labelled mastery row: a short label (e.g. "LO1"), an optional longer
 * description, a colour-coded track, and the percentage. Used on the
 * dashboard's "Mastery by learning outcome" list.
 */
export function MasteryBar({
  label,
  sublabel,
  value,
  className,
}: {
  label: string;
  sublabel?: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("py-1", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-[15px] font-semibold text-foreground">
            {label}
          </span>
          {sublabel ? (
            <span className="truncate text-sm text-muted">{sublabel}</span>
          ) : null}
        </div>
        <span
          className={cn(
            "shrink-0 text-sm font-semibold",
            masteryTextClass(value),
          )}
        >
          {value}%
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${sublabel ?? label} mastery`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${value}%`, backgroundColor: masteryColor(value) }}
        />
      </div>
    </div>
  );
}
