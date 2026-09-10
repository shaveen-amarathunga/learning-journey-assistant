"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLearningPlan, regenerateLearningPlan } from "@/lib/api";
import { getDoneStepIds, setStepDone } from "@/lib/planProgress";
import type { LearningPlan, PlanStep, PlanStepStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BackHeader } from "@/components/BackHeader";
import { Spinner } from "@/components/ui/PageState";
import { CheckIcon, RefreshIcon } from "@/components/ui/icons";

/** Apply the student's saved tick state to a freshly fetched plan. */
function applyProgress(plan: LearningPlan): LearningPlan {
  const done = new Set(getDoneStepIds());
  return {
    ...plan,
    steps: plan.steps.map((s) =>
      done.has(s.id) ? { ...s, status: "done" } : s,
    ),
  };
}

export default function LearningPlanPage() {
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    let active = true;
    fetchLearningPlan().then((p) => {
      if (active) setPlan(applyProgress(p));
    });
    return () => {
      active = false;
    };
  }, []);

  function toggleStep(id: string) {
    setPlan((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.map((s) => {
        if (s.id !== id) return s;
        const nextStatus: PlanStepStatus =
          s.status === "done" ? "todo" : "done";
        setStepDone(id, nextStatus === "done");
        return { ...s, status: nextStatus };
      });
      return { ...prev, steps };
    });
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const next = await regenerateLearningPlan();
    setPlan(applyProgress(next));
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
        <div className="flex items-center justify-between gap-3">
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
          <RefreshIcon
            className={cn("h-4 w-4", regenerating && "animate-spin")}
          />
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

  const subtitle = done
    ? `Completed${step.resultNote ? ` · ${step.resultNote}` : ""}`
    : step.origin === "reflection"
      ? `Your note · targets ${step.targetOutcomeName}`
      : `Est. ${step.estMinutes} min · targets ${step.targetOutcomeName}`;

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border px-4 py-3">
      <button
        type="button"
        onClick={() => onToggle(step.id)}
        aria-pressed={done}
        aria-label={
          done ? `Mark "${step.title}" not done` : `Mark "${step.title}" done`
        }
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          done
            ? "border-status-high bg-status-high text-white"
            : "border-neutral-300 hover:border-neutral-400",
        )}
      >
        {done ? <CheckIcon className="h-3.5 w-3.5" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[15px] font-medium",
            done ? "text-muted line-through" : "text-foreground",
          )}
        >
          {step.title}
        </p>
        <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
      </div>

      {step.href && !done ? (
        <Link
          href={step.href}
          className="mt-0.5 shrink-0 text-sm font-medium text-brand hover:underline"
        >
          Open →
        </Link>
      ) : null}
    </li>
  );
}
