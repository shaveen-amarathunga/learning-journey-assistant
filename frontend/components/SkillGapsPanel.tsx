"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchKnowledgeGaps } from "@/lib/api";
import type { KnowledgeGap } from "@/lib/types";
import { QuoteIcon, TargetIcon } from "@/components/ui/icons";

/**
 * "Skill gaps" — knowledge gaps the NLP analyser found in the student's
 * rubric feedback. On the dashboard it lists every gap (linking to the
 * outcome); on an outcome page it shows just that outcome's gaps with the
 * feedback that revealed them.
 */
export function SkillGapsPanel({ outcomeCode }: { outcomeCode?: string }) {
  const [gaps, setGaps] = useState<KnowledgeGap[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchKnowledgeGaps()
      .then((analysis) => {
        if (active) setGaps(uniqueGaps(analysis.knowledge_gaps));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const shown = (gaps ?? []).filter(
    (g) => !outcomeCode || g.lo_code.toUpperCase() === outcomeCode.toUpperCase(),
  );

  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        <TargetIcon className="h-4 w-4 text-status-low" />
        {outcomeCode ? "Skill gaps found in your feedback" : "Skill gaps"}
      </h2>

      {failed ? (
        <p className="mt-3 text-sm text-muted">
          Couldn&apos;t analyse your feedback right now.
        </p>
      ) : gaps === null ? (
        <p className="mt-3 text-sm text-muted">Analysing your feedback…</p>
      ) : shown.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No skill gaps found in your feedback{outcomeCode ? " for this outcome" : ""}.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((g) => (
            <li key={`${g.lo_code}-${g.knowledge_gap}`}>
              {outcomeCode ? (
                <div className="rounded-xl border border-border px-4 py-3">
                  <p className="text-[15px] font-medium text-foreground">
                    {g.knowledge_gap}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{g.recommendation}</p>
                  <p className="mt-2 flex items-start gap-2 text-sm text-muted">
                    <QuoteIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span className="min-w-0">“{g.feedback}”</span>
                  </p>
                </div>
              ) : (
                <Link
                  href={`/outcomes/${g.lo_code.toLowerCase()}`}
                  className="flex items-start gap-3 rounded-xl border border-border px-4 py-3 hover:bg-neutral-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-foreground">
                      {g.knowledge_gap}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {g.recommendation}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-muted">
                    {g.lo_code}
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The analyser can report a gap more than once; keep the lowest-scoring one. */
function uniqueGaps(gaps: KnowledgeGap[]): KnowledgeGap[] {
  const byKey = new Map<string, KnowledgeGap>();
  for (const g of gaps) {
    const key = `${g.lo_code}|${g.knowledge_gap}`;
    const prev = byKey.get(key);
    if (!prev || g.score < prev.score) byKey.set(key, g);
  }
  return [...byKey.values()].sort((a, b) => a.score - b.score);
}
