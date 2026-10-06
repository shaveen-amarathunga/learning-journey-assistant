"use client";

import { useState } from "react";
import { fetchAiStudyPlan } from "@/lib/api";
import type { AiGapPlan } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { LightbulbIcon, RefreshIcon } from "@/components/ui/icons";

/**
 * AI-personalised study plan: for each knowledge gap the LLM explains what
 * to improve and suggests activities and a practical exercise.
 */
export function AiStudyPlan() {
  const [plans, setPlans] = useState<AiGapPlan[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function generate() {
    setBusy(true);
    setError(false);
    try {
      setPlans(await fetchAiStudyPlan());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <LightbulbIcon className="h-4 w-4 text-brand" />
          AI study plan
        </h2>
        <p className="mt-1 text-sm text-muted">
          Personalised activities for each skill gap found in your feedback.
        </p>
      </div>

      {plans === null ? null : plans.length === 0 ? (
        <p className="text-sm text-muted">
          No skill gaps found — nothing to plan for right now.
        </p>
      ) : (
        <ul className="space-y-3">
          {plans.map((p) => {
            const ai = p.ai_recommendation;
            const activities = (ai.learning_activities ?? []).filter((a) =>
              a?.trim(),
            );
            return (
              <li
                key={`${p.lo_code}-${p.knowledge_gap}`}
                className="rounded-xl border border-border px-4 py-3"
              >
                <p className="text-[15px] font-medium text-foreground">
                  {p.lo_code} · {p.knowledge_gap}
                </p>
                {ai.error ? (
                  <p className="mt-1 text-sm text-status-low">
                    Couldn&apos;t generate a plan for this gap.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2 text-sm">
                    {ai.study_priority ? (
                      <p className="font-medium text-foreground">
                        {ai.study_priority}
                      </p>
                    ) : null}
                    {ai.explanation ? (
                      <p className="text-muted">{ai.explanation}</p>
                    ) : null}
                    {activities.length ? (
                      <ul className="list-disc space-y-1 pl-5 text-foreground">
                        {activities.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    ) : null}
                    {ai.practical_exercise ? (
                      <p className="text-foreground">
                        <span className="font-medium">Try this: </span>
                        {ai.practical_exercise}
                      </p>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-sm text-status-low">
          The AI service isn&apos;t available right now. Please try again later.
        </p>
      ) : null}

      <Button
        size="lg"
        fullWidth
        variant={plans ? "secondary" : "primary"}
        onClick={generate}
        disabled={busy}
      >
        <RefreshIcon className={cn("h-4 w-4", busy && "animate-spin")} />
        {busy
          ? "Generating… (this can take a moment)"
          : plans
            ? "Generate again"
            : "Generate my AI study plan"}
      </Button>

      <Disclaimer>
        AI suggestions are a study aid based on your feedback — they don&apos;t
        change your marks or replace advice from your teaching staff.
      </Disclaimer>
    </Card>
  );
}
