"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchQuiz, submitQuiz } from "@/lib/api";
import type { Quiz, QuizResult } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/PageState";
import {
  CheckCircleIcon,
  TrendingUpIcon,
  XCircleIcon,
  XIcon,
} from "@/components/ui/icons";

type Phase = "loading" | "quiz" | "submitting" | "results";

export default function QuizPage() {
  const router = useRouter();
  const params = useParams<{ outcomeId: string }>();
  const outcomeId = params.outcomeId;

  const [quiz, setQuiz] = useState<Quiz | null | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("loading");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    let active = true;
    fetchQuiz(outcomeId).then((q) => {
      if (!active) return;
      setQuiz(q);
      setPhase(q ? "quiz" : "loading");
    });
    return () => {
      active = false;
    };
  }, [outcomeId]);

  if (phase === "loading" && quiz === undefined) {
    return <Spinner label="Building your quiz" />;
  }

  if (quiz === null) {
    return (
      <EmptyState title="No quiz available for this outcome yet.">
        Try again from the outcome detail screen.
      </EmptyState>
    );
  }

  const total = quiz!.questions.length;
  const question = quiz!.questions[index];
  const selected = answers[question?.id ?? ""] ?? "";

  function choose(key: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: key }));
  }

  async function next() {
    if (!selected) return;
    if (index < total - 1) {
      setIndex(index + 1);
      return;
    }
    setPhase("submitting");
    const r = await submitQuiz(outcomeId, answers);
    setResult(r);
    setPhase("results");
  }

  function retry() {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setPhase("quiz");
  }

  if (phase === "results" && result) {
    return <Results result={result} onRetry={retry} />;
  }

  const progress =
    phase === "submitting" ? 100 : ((index + 1) / total) * 100;

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {quiz!.outcomeName} · Question {index + 1} of {total}
        </p>
        <button
          type="button"
          aria-label="Close quiz"
          onClick={() => router.push(`/outcomes/${outcomeId}`)}
          className="rounded-lg p-1 text-muted hover:bg-neutral-100 hover:text-foreground"
        >
          <XIcon />
        </button>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-[15px] font-medium text-foreground">
          {question.prompt}
        </legend>
        <div className="space-y-2">
          {question.options.map((opt) => {
            const active = selected === opt.key;
            return (
              <label
                key={opt.key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-[15px] transition-colors",
                  active
                    ? "border-blue-500 bg-blue-50 text-foreground"
                    : "border-border hover:bg-neutral-50",
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={opt.key}
                  checked={active}
                  onChange={() => choose(opt.key)}
                  className="sr-only"
                />
                <span className="font-semibold">{opt.key}.</span>
                <span>{opt.text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Button
        size="lg"
        fullWidth
        onClick={next}
        disabled={!selected || phase === "submitting"}
      >
        {phase === "submitting"
          ? "Scoring…"
          : index < total - 1
            ? "Submit answer"
            : "Finish quiz"}
      </Button>
    </Card>
  );
}

function Results({
  result,
  onRetry,
}: {
  result: QuizResult;
  onRetry: () => void;
}) {
  return (
    <Card className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <CheckCircleIcon className="h-10 w-10 text-status-high" />
        <h1 className="mt-3 text-lg font-semibold text-foreground">
          Quiz complete
        </h1>
        <p className="mt-1 text-sm text-muted">
          {result.outcomeName} · {result.correct} of {result.total} correct
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
        <span className="text-[15px] font-medium text-foreground">
          Mastery updated
        </span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-status-high">
          {result.masteryBefore}% → {result.masteryAfter}%
          <TrendingUpIcon className="h-4 w-4" />
        </span>
      </div>

      {result.review.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-muted">
            {result.review.length === 1
              ? "Question to review"
              : "Questions to review"}
          </h2>
          <ul className="mt-3 space-y-2">
            {result.review.map(({ question, chosenKey }) => (
              <li
                key={question.id}
                className="flex items-start gap-3 rounded-xl bg-neutral-50 px-4 py-3"
              >
                <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-status-low" />
                <div>
                  <p className="text-[15px] font-medium text-foreground">
                    {question.reviewLabel}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    You answered {chosenKey || "—"} · correct answer was{" "}
                    {question.correctKey}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-center text-sm text-muted">
          Perfect score — nothing to review.
        </p>
      )}

      <div className="space-y-2">
        <ButtonLink href="/" size="lg" fullWidth>
          Back to dashboard
        </ButtonLink>
        <Button variant="secondary" size="lg" fullWidth onClick={onRetry}>
          Retry quiz
        </Button>
      </div>
    </Card>
  );
}
