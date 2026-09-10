"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchOutcomeDetail } from "@/lib/api";
import type { OutcomeDetail } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MasteryBadge } from "@/components/ui/Badge";
import { BackHeader } from "@/components/BackHeader";
import { StudyStrategies } from "@/components/StudyStrategies";
import { Spinner, EmptyState, ErrorState } from "@/components/ui/PageState";
import {
  FileTextIcon,
  PlayIcon,
  QuoteIcon,
} from "@/components/ui/icons";

export default function OutcomeDetailPage() {
  const params = useParams<{ outcomeId: string }>();
  const [reloadKey, setReloadKey] = useState(0);

  // Keying on outcomeId + reloadKey remounts on navigation and on retry,
  // so loading/error state always starts fresh.
  return (
    <OutcomeDetailView
      key={`${params.outcomeId}:${reloadKey}`}
      outcomeId={params.outcomeId}
      onRetry={() => setReloadKey((k) => k + 1)}
    />
  );
}

function OutcomeDetailView({
  outcomeId,
  onRetry,
}: {
  outcomeId: string;
  onRetry: () => void;
}) {
  const router = useRouter();

  const [detail, setDetail] = useState<OutcomeDetail | null | undefined>(
    undefined,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchOutcomeDetail(outcomeId)
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [outcomeId]);

  if (failed) {
    return (
      <div className="space-y-6">
        <BackHeader title="Learning outcome" />
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (detail === undefined) return <Spinner label="Loading outcome" />;

  if (detail === null) {
    return (
      <div className="space-y-6">
        <BackHeader title="Outcome not found" />
        <EmptyState title="We couldn't find that learning outcome.">
          It may not be tracked for this subject yet.
        </EmptyState>
      </div>
    );
  }

  const { outcome, subjectCode, reasons, strategies, resources } = detail;

  return (
    <div className="space-y-6">
      <BackHeader
        title={outcome.code ?? outcome.name}
        subtitle={
          outcome.code ? `${subjectCode} · ${outcome.name}` : subjectCode
        }
        right={<MasteryBadge value={outcome.mastery} />}
      />

      <Card className="space-y-7">
        {/* Why this score */}
        <section>
          <h2 className="text-sm font-medium text-muted">Why this score</h2>
          {reasons.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No graded feedback is linked to this outcome yet.
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {reasons.map((fb) => (
              <li
                key={fb.id}
                className="flex items-start gap-3 rounded-xl bg-neutral-50 px-4 py-3"
              >
                <QuoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                <div>
                  <p className="text-[15px] font-medium text-foreground">
                    “{fb.comment}”
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {fb.assignment} · scored {fb.score}/{fb.maxScore}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Study strategies */}
        <StudyStrategies strategies={strategies} mastery={outcome.mastery} />

        {/* Recommended resources */}
        <section>
          <h2 className="text-sm font-medium text-muted">
            Recommended resources
          </h2>
          {resources.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Linked subject resources are coming soon.
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {resources.map((r) => (
                  <li key={r.id}>
                    <a
                      href={r.href ?? "#"}
                      className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-neutral-50"
                    >
                      <FileTextIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="text-[15px] text-foreground">
                        {r.title}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Grounded in your subject material — not freely generated.
              </p>
            </>
          )}
        </section>

        <Button
          size="lg"
          fullWidth
          onClick={() => router.push(`/quiz/${outcome.id}`)}
        >
          <PlayIcon className="h-4 w-4" />
          Generate practice quiz
        </Button>
      </Card>
    </div>
  );
}
