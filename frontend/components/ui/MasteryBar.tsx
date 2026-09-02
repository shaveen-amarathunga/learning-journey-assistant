import { masteryColor, masteryTextClass } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * A labelled mastery row: outcome name, a colour-coded track, and the
 * percentage. Used on the dashboard's "Mastery by learning outcome" list.
 */
export function MasteryBar({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("py-1", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-medium text-foreground">{label}</span>
        <span className={cn("text-sm font-semibold", masteryTextClass(value))}>
          {value}%
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} mastery`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${value}%`, backgroundColor: masteryColor(value) }}
        />
      </div>
    </div>
  );
}
