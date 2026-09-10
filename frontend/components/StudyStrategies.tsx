import { LightbulbIcon } from "@/components/ui/icons";
import type { StudyStrategy } from "@/lib/types";

/**
 * 2–3 evidence-based study techniques matched to the pattern in this
 * outcome's feedback. Shown on the outcome detail screen. The heading
 * softens for outcomes that are already strong.
 */
export function StudyStrategies({
  strategies,
  mastery,
}: {
  strategies: StudyStrategy[];
  mastery?: number;
}) {
  if (strategies.length === 0) return null;

  const heading =
    mastery !== undefined && mastery >= 80
      ? "Ways to strengthen this outcome"
      : "How to close this gap";

  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        <LightbulbIcon className="h-4 w-4 text-brand" />
        {heading}
      </h2>
      <ul className="mt-3 space-y-2">
        {strategies.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-border px-4 py-3"
          >
            <p className="text-[15px] font-semibold text-foreground">
              {s.title}
            </p>
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium text-foreground/70">
                Why it works:
              </span>{" "}
              {s.why}
            </p>
            <p className="mt-1 text-sm text-foreground">
              <span className="font-medium">Try this:</span> {s.how}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Matched to your recent feedback — general techniques with strong
        evidence behind them.
      </p>
    </section>
  );
}
