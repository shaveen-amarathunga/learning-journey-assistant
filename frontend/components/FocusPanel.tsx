import { ButtonLink } from "@/components/ui/Button";
import { TargetIcon } from "@/components/ui/icons";
import { masteryTextClass } from "@/lib/format";
import type { FocusOutcome } from "@/lib/focus";

/**
 * "Focus this week" — the one outcome the student should act on next.
 * Sits at the top of the dashboard, above the status tiles.
 */
export function FocusPanel({ focus }: { focus: FocusOutcome }) {
  const { outcome, recentComment, commentCount, isLowest } = focus;

  const context = [
    isLowest ? "your lowest outcome right now" : "worth some attention",
    commentCount > 0
      ? `${commentCount} recent comment${commentCount > 1 ? "s" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rounded-xl border border-border bg-neutral-50 p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <TargetIcon className="h-4 w-4 text-brand" />
        Focus this week
      </p>

      <p className="mt-2 text-[15px] font-semibold text-foreground">
        {outcome.code ? `${outcome.code} · ` : ""}
        {outcome.name}
      </p>

      <p className="mt-1 text-sm text-muted">
        <span className={`font-semibold ${masteryTextClass(outcome.mastery)}`}>
          {outcome.mastery}%
        </span>{" "}
        · {context}
      </p>

      {recentComment ? (
        <blockquote className="mt-3 border-l-2 border-border pl-3 text-sm text-muted">
          “{recentComment.comment}”
          <span className="mt-0.5 block text-xs">
            {recentComment.assignment}
          </span>
        </blockquote>
      ) : null}

      <ButtonLink
        href={`/outcomes/${outcome.id}`}
        size="md"
        className="mt-4 w-full sm:w-auto"
      >
        Work on this outcome
      </ButtonLink>
    </section>
  );
}
