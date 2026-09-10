import Link from "next/link";
import { CheckCircleIcon } from "@/components/ui/icons";
import { masteryTextClass } from "@/lib/format";
import type { LearningOutcome } from "@/lib/types";

/**
 * "Your strengths" — the 1–2 outcomes the student is doing well on.
 * Deliberately lighter than the focus panel: reinforcement, not a task.
 */
export function StrengthsPanel({
  strengths,
}: {
  strengths: LearningOutcome[];
}) {
  if (strengths.length === 0) return null;

  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        <CheckCircleIcon className="h-4 w-4 text-status-high" />
        Your strengths
      </h2>
      <ul className="mt-3 space-y-2">
        {strengths.map((o) => (
          <li key={o.id}>
            <Link
              href={`/outcomes/${o.id}`}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-neutral-50"
            >
              <span className="min-w-0 flex-1 truncate text-[15px]">
                {o.code ? (
                  <span className="font-semibold text-foreground">
                    {o.code} ·{" "}
                  </span>
                ) : null}
                <span className="text-muted">{o.name}</span>
              </span>
              <span
                className={`shrink-0 text-sm font-semibold ${masteryTextClass(
                  o.mastery,
                )}`}
              >
                {o.mastery}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
