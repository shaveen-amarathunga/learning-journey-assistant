"use client";

import { useEffect, useState } from "react";
import { fetchLearningPlan, regenerateLearningPlan } from "@/lib/api";
import type { LearningPlan, PlanStep } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BackHeader } from "@/components/BackHeader";
import { Spinner } from "@/components/ui/PageState";
import { CheckIcon, RefreshIcon } from "@/components/ui/icons";

export default function LearningPlanPage() {
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    let active = true;
    fetchLearningPlan().then((p) => {
      if (active) setPlan(p);
    });
    return () => {
      active = false;
    };
  }, []);

  function toggleStep(id: string) {
    setPlan((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((s) =>
              s.id === id
                ? { ...s, status: s.status === "done" ? "todo" : "done" }
                : s,
            ),
          }
        : prev,
    );
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const next = await regenerateLearningPlan();
    setPlan(next);
    setRegenerating(false);
  }

  if (!plan) return <Spinner label="Loading your plan" />;

  const done = plan.steps.filter((s) => s.status === "done").length;

  return (
    <div className="space-y-6">
      <BackHeader
        title="Your learning plan"
        subtitle={`${plan.subjectCode} · ${plan.generatedFrom}`}
      />

      <Card className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            Based on feedback grounded in your subject material — not generated
            freely
          </p>
          <span className="shrink-0 text-xs font-medium text-muted">
            {done}/{plan.steps.length} done
          </span>
        </div>

        <ul className="space-y-2">
          {plan.steps.map((step) => (
            <PlanRow key={step.id} step={step} onToggle={toggleStep} />
          ))}
        </ul>

        <Button
          size="lg"
          fullWidth
          variant="primary"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          <RefreshIcon className={cn("h-4 w-4", regenerating && "animate-spin")} />
          {regenerating ? "Regenerating…" : "Regenerate plan"}
        </Button>
      </Card>
    </div>
  );
}

function PlanRow({
  step,
  onToggle,
}: {
  step: PlanStep;
  onToggle: (id: string) => void;
}) {
  const done = step.status === "done";
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(step.id)}
        aria-pressed={done}
        className="flex w-full items-start gap-3 rounded-xl border border-border px-4 py-3 text-left hover:bg-neutral-50"
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            done
              ? "border-status-high bg-status-high text-white"
              : "border-neutral-300",
          )}
          aria-hidden="true"
        >
          {done ? <CheckIcon className="h-3.5 w-3.5" /> : null}
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block text-[15px] font-medium",
              done ? "text-muted line-through" : "text-foreground",
            )}
          >
            {step.title}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {done
              ? `Completed${step.resultNote ? ` · ${step.resultNote}` : ""}`
              : `Est. ${step.estMinutes} min · targets ${step.targetOutcomeName}`}
          </span>
        </span>
      </button>
    </li>
  );
}
