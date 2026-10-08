"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLearningPlan, regenerateLearningPlan } from "@/lib/api";
import type { LearningPlan, PlanStep, PlanStepStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BackHeader } from "@/components/BackHeader";
import { ErrorState, Spinner } from "@/components/ui/PageState";
import { CheckIcon, RefreshIcon } from "@/components/ui/icons";
import {
  clearDoneStepIds,
  getDoneStepIds,
  replaceDoneStepIds,
  setStepDone,
} from "@/lib/planProgress";

/** Apply the student's saved tick state to a freshly fetched plan. */
function applyProgress(plan: LearningPlan): LearningPlan {
  const done = new Set(getDoneStepIds(plan.subjectCode));
  return {
    ...plan,
    steps: plan.steps.map((s) =>
      done.has(s.id) ? { ...s, status: "done" } : s,
    ),
  };
}

function recommendationKey(step: PlanStep): string {
  return JSON.stringify([
    step.id,
    step.title,
    step.estMinutes,
    step.targetOutcomeName,
    step.origin ?? null,
    step.href ?? null,
  ]);
}

function preserveUnchangedProgress(
  current: LearningPlan,
  next: LearningPlan,
): LearningPlan {
  const previousSteps = new Map(
    current.steps.map((step) => [recommendationKey(step), step]),
  );
  const steps = next.steps.map((step) => {
    const previous = previousSteps.get(recommendationKey(step));
    return previous
      ? { ...step, status: previous.status, resultNote: previous.resultNote }
      : step;
  });

  replaceDoneStepIds(
    next.subjectCode,
    steps.filter((step) => step.status === "done").map((step) => step.id),
  );

  return { ...next, steps };
}

function recommendationsMatch(
  current: LearningPlan,
  next: LearningPlan,
): boolean {
  return (
    current.subjectCode === next.subjectCode &&
    JSON.stringify(current.steps.map(recommendationKey)) ===
      JSON.stringify(next.steps.map(recommendationKey))
  );
}

function formatMastery(mastery: number): string {
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(mastery)}%`;
}

export default function LearningPlanPage() {
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    kind: "success" | "error";
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchLearningPlan()
      .then((p) => {
        if (!active) return;
        setPlan(applyProgress(p));
        setLoadingFailed(false);
      })
      .catch((error) => {
        console.error("Failed to load learning plan:", error);
        if (active) setLoadingFailed(true);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function toggleStep(id: string) {
    setMessage(null);
    if (!plan) return;
    const step = plan.steps.find((item) => item.id === id);
    if (!step) return;

    const nextStatus: PlanStepStatus =
      step.status === "done" ? "todo" : "done";
    setStepDone(plan.subjectCode, id, nextStatus === "done");
    setPlan({
      ...plan,
      steps: plan.steps.map((item) =>
        item.id === id ? { ...item, status: nextStatus } : item,
      ),
    });
  }

  async function handleRegenerate() {
    if (!plan) return;
    const current = plan;
    setRegenerating(true);
    setMessage(null);
    try {
      const next = await regenerateLearningPlan();
      const unchanged = recommendationsMatch(current, next);
      setPlan(preserveUnchangedProgress(current, next));
      setMessage({
        text: unchanged
          ? "Your learning plan is already up to date."
          : "Your learning plan has been updated.",
        kind: "success",
      });
    } catch (error) {
      console.error("Failed to regenerate learning plan:", error);
      setMessage({
        text: "Couldn't regenerate your learning plan. Please try again.",
        kind: "error",
      });
    } finally {
      setRegenerating(false);
    }
  }

  function handleRestart() {
    if (!plan) return;
    const completed = plan.steps.some((step) => step.status === "done");
    if (
      completed &&
      !window.confirm(
        "Restart this subject's plan and clear its completed task checkmarks?",
      )
    ) {
      return;
    }

    clearDoneStepIds(plan.subjectCode);
    setPlan((current) =>
      current
        ? {
            ...current,
            steps: current.steps.map((step) => ({
              ...step,
              status: "todo",
            })),
          }
        : current,
    );
    setMessage({
      text: completed
        ? "Your plan has been restarted."
        : "There were no completed tasks to reset.",
      kind: "success",
    });
  }

  if (!plan && loadingFailed) {
    return (
      <ErrorState
        title="Couldn't load your learning plan"
        onRetry={() => {
          setLoadingFailed(false);
          setReloadKey((key) => key + 1);
        }}
      />
    );
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
            <PlanRow
              key={step.id}
              step={step}
              onToggle={toggleStep}
              disabled={regenerating}
            />
          ))}
        </ul>

        <div className="grid gap-3 sm:grid-cols-2">
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
          <Button
            size="lg"
            fullWidth
            variant="secondary"
            onClick={handleRestart}
            disabled={regenerating}
          >
            Restart plan
          </Button>
        </div>
        {message ? (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={cn(
              "text-sm",
              message.kind === "error" ? "text-status-low" : "text-status-high",
            )}
          >
            {message.text}
          </p>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Why this plan?
        </h2>
        <p className="text-sm text-muted">
          Activities are prioritised using your weakest learning outcomes. We
          connect study strategies and practice quizzes to those outcomes and
          the feedback available for them.
        </p>
        {plan.priorityOutcomes && plan.priorityOutcomes.length > 0 ? (
          <ul className="space-y-2">
            {plan.priorityOutcomes.map((outcome) => (
              <li
                key={outcome.code}
                className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-foreground"
              >
                <span className="font-semibold">{outcome.code} · </span>
                {outcome.name} is one of your lowest-scoring outcomes at{" "}
                <span className="font-semibold">
                  {formatMastery(outcome.mastery)} mastery
                </span>
                , so activities for it are prioritised.
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Mastery scores are not available yet, so outcome-specific priorities
            cannot be shown.
          </p>
        )}
      </Card>
    </div>
  );
}

function PlanRow({
  step,
  onToggle,
  disabled,
}: {
  step: PlanStep;
  onToggle: (id: string) => void;
  disabled: boolean;
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
        disabled={disabled}
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
