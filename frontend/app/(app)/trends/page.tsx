"use client";

import { useEffect, useState } from "react";
import { fetchTrends } from "@/lib/api";
import type { OutcomeTrend } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { BackHeader } from "@/components/BackHeader";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/PageState";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { TrendingUpIcon } from "@/components/ui/icons";
import { MasteryTrendChart } from "@/components/MasteryTrendChart";

function formatTrendDelta(delta: number): string {
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<OutcomeTrend[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    let latestRequest = 0;

    const load = () => {
      const requestId = ++latestRequest;
      fetchTrends()
        .then((t) => {
          if (!active || requestId !== latestRequest) return;
          setTrends(t);
          setFailed(false);
          setActiveId((current) =>
            t.some((trend) => trend.outcomeId === current)
              ? current
              : t[0]?.outcomeId ?? null,
          );
        })
        .catch((error) => {
          console.error("Failed to load progress trends:", error);
          if (active && requestId === latestRequest) setFailed(true);
        });
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") load();
    };

    load();
    window.addEventListener("focus", load);
    window.addEventListener("pageshow", load);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.removeEventListener("focus", load);
      window.removeEventListener("pageshow", load);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [reloadKey]);

  if (!trends && failed) {
    return (
      <div className="space-y-6">
        <BackHeader
          title="Progress trends"
          subtitle="Across your completed quizzes"
        />
        <ErrorState
          title="Couldn't load progress trends"
          onRetry={() => {
            setFailed(false);
            setReloadKey((key) => key + 1);
          }}
        />
      </div>
    );
  }

  if (!trends) return <Spinner label="Loading progress" />;

  const active = trends.find((t) => t.outcomeId === activeId) ?? trends[0];
  const hasAnyHistory = trends.some((trend) => trend.series.length > 0);

  return (
    <div className="space-y-6">
      <BackHeader
        title="Progress trends"
        subtitle="Across your completed quizzes"
      />

      {failed ? (
        <ErrorState
          title="Couldn't load progress trends"
          onRetry={() => {
            setTrends(null);
            setFailed(false);
            setReloadKey((key) => key + 1);
          }}
        />
      ) : !hasAnyHistory ? (
        <Card>
          <EmptyState title="No quiz history yet">
            Complete a practice quiz to see your mastery progress here.
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {trends.map((t) => (
                <button
                  key={t.outcomeId}
                  type="button"
                  onClick={() => setActiveId(t.outcomeId)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                    t.outcomeId === active.outcomeId
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-border text-muted hover:bg-neutral-50",
                  )}
                >
                  {t.outcomeCode ?? t.outcomeName}
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-neutral-50 p-4">
              <p className="text-[15px] font-medium text-foreground">
                {active.outcomeCode ? `${active.outcomeCode} · ` : ""}
                {active.outcomeName}
              </p>
              <div className="mt-2">
                {active.series.length > 0 ? (
                  <MasteryTrendChart series={active.series} />
                ) : (
                  <EmptyState title="No quiz history for this outcome yet">
                    Complete a practice quiz for this learning outcome to see
                    its mastery trend.
                  </EmptyState>
                )}
              </div>
            </div>

            <Disclaimer>
              Each point shows the recorded mastery before or after a completed
              quiz.
            </Disclaimer>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-sm font-medium text-muted">
              Change on the latest quiz
            </h2>
            <ul className="divide-y divide-border">
              {trends.map((t) => (
                <li
                  key={t.outcomeId}
                  className="flex items-center justify-between py-3"
                >
                  <span className="min-w-0 flex-1 truncate pr-3 text-[15px] text-foreground">
                    {t.outcomeCode ? (
                      <span className="font-semibold">{t.outcomeCode} · </span>
                    ) : null}
                    {t.outcomeName}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-semibold",
                      t.deltaSinceLast === null || t.deltaSinceLast === 0
                        ? "text-muted"
                        : t.deltaSinceLast > 0
                          ? "text-status-high"
                          : "text-status-low",
                    )}
                  >
                    {t.deltaSinceLast !== null && t.deltaSinceLast !== 0 ? (
                      <TrendingUpIcon
                        className={cn(
                          "h-4 w-4",
                          t.deltaSinceLast < 0 && "-scale-y-100",
                        )}
                      />
                    ) : (
                      <span aria-hidden="true">—</span>
                    )}
                    {t.deltaSinceLast === null
                      ? "No quiz data"
                      : formatTrendDelta(t.deltaSinceLast)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
