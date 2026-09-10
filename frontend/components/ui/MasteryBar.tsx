import { masteryColor, masteryTextClass } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * A labelled mastery row: a short label (e.g. "LO1"), an optional longer
 * description, an optional "+N%" delta, a colour-coded track, and the
 * percentage. Used on the dashboard's "Mastery by learning outcome" list.
 */
export function MasteryBar({
  label,
  sublabel,
  value,
  delta,
  className,
}: {
  label: string;
  sublabel?: string;
  value: number;
  delta?: number;
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
        <div className="flex shrink-0 items-baseline gap-2">
          <span
            className={cn("text-sm font-semibold", masteryTextClass(value))}
          >
            {value}%
          </span>
          {delta !== undefined && delta > 0 ? (
            <span className="text-xs font-medium text-status-high">
              +{delta}%
            </span>
          ) : null}
        </div>
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
