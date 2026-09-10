"use client";

import { useEffect, useState } from "react";
import { fetchTrends } from "@/lib/api";
import type { OutcomeTrend } from "@/lib/types";
import { cn } from "@/lib/cn";
import { formatDelta } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { BackHeader } from "@/components/BackHeader";
import { Spinner } from "@/components/ui/PageState";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { TrendingUpIcon } from "@/components/ui/icons";
import { MasteryTrendChart } from "@/components/MasteryTrendChart";

export default function TrendsPage() {
  const [trends, setTrends] = useState<OutcomeTrend[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTrends().then((t) => {
      if (!active) return;
      setTrends(t);
      setActiveId(t[0]?.outcomeId ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!trends) return <Spinner label="Loading progress" />;

  const active = trends.find((t) => t.outcomeId === activeId) ?? trends[0];

  return (
    <div className="space-y-6">
      <BackHeader
        title="Progress trends"
        subtitle="CSE3CAP · across your assessments this semester"
      />

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
            <MasteryTrendChart series={active.series} />
          </div>
        </div>

        <Disclaimer>
          Trend history is indicative until assessment-level history is
          available.
        </Disclaimer>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-medium text-muted">
          Change since last assessment
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
                  t.deltaSinceLast > 0
                    ? "text-status-high"
                    : t.deltaSinceLast < 0
                      ? "text-status-low"
                      : "text-muted",
                )}
              >
                {t.deltaSinceLast !== 0 ? (
                  <TrendingUpIcon
                    className={cn(
                      "h-4 w-4",
                      t.deltaSinceLast < 0 && "-scale-y-100",
                    )}
                  />
                ) : (
                  <span aria-hidden="true">—</span>
                )}
                {formatDelta(t.deltaSinceLast)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
