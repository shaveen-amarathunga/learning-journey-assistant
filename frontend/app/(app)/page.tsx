"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchDashboard } from "@/lib/api";
import type { DashboardData } from "@/lib/types";
import { masteryTextClass } from "@/lib/format";
import { pickFocusOutcome } from "@/lib/focus";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { MasteryBar } from "@/components/ui/MasteryBar";
import { Spinner, ErrorState } from "@/components/ui/PageState";
import { AccountMenu } from "@/components/AccountMenu";
import { FocusPanel } from "@/components/FocusPanel";
import {
  BellIcon,
  ChevronRightIcon,
  ListChecksIcon,
  MessageSquareIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";

export default function DashboardPage() {
  // Remount on retry so the loading/error state resets cleanly.
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <Dashboard key={reloadKey} onRetry={() => setReloadKey((k) => k + 1)} />
  );
}

function Dashboard({ onRetry }: { onRetry: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchDashboard()
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed) {
    return (
      <ErrorState title="Couldn't load your dashboard" onRetry={onRetry} />
    );
  }

  if (!data) return <Spinner label="Loading your dashboard" />;

  const { student } = data;
  const focus = pickFocusOutcome(data.outcomes, data.recentFeedback);

  return (
    <Card className="space-y-7 p-6 sm:p-8">
      {/* Profile header */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <AccountMenu align="left" />
          <div>
            <p className="font-semibold text-foreground">{student.name}</p>
            <p className="text-sm text-muted">
              {student.subjectCode} · {student.subjectName}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-lg p-1.5 text-muted hover:bg-neutral-100 hover:text-foreground"
        >
          <BellIcon />
        </button>
      </header>

      {/* Focus this week */}
      {focus ? <FocusPanel focus={focus} /> : null}

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Overall mastery"
          value={`${data.overallMastery}%`}
          accent={masteryTextClass(data.overallMastery)}
        />
        <StatCard label="Outcomes tracked" value={data.outcomesTracked} />
        <StatCard label="Quizzes completed" value={data.quizzesCompleted} />
      </div>

      {/* Mastery by learning outcome */}
      <section>
        <h2 className="text-sm font-medium text-muted">
          Mastery by learning outcome
        </h2>
        <ul className="mt-3 divide-y divide-border">
          {data.outcomes.map((o) => (
            <li key={o.id}>
              <Link
                href={`/outcomes/${o.id}`}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-neutral-50"
              >
                <MasteryBar
                  label={o.code ?? o.name}
                  sublabel={o.code ? o.name : undefined}
                  value={o.mastery}
                  className="min-w-0 flex-1"
                />
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-neutral-400" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent feedback */}
      <section>
        <h2 className="text-sm font-medium text-muted">Recent feedback</h2>
        <ul className="mt-3 space-y-2">
          {data.recentFeedback.map((fb) => (
            <li key={fb.id}>
              <button
                type="button"
                onClick={() => router.push(`/outcomes/${fb.outcomeId}`)}
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left hover:bg-neutral-50"
              >
                <MessageSquareIcon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                <span>
                  <span className="block text-[15px] font-medium text-foreground">
                    {fb.comment}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {fb.assignment} · {fb.outcomeName}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Entry points to the rest of the journey */}
      <section className="grid grid-cols-1 gap-3 border-t border-border pt-6 sm:grid-cols-2">
        <Link
          href="/plan"
          className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-neutral-50"
        >
          <span className="flex items-center gap-2.5 text-[15px] font-medium text-foreground">
            <ListChecksIcon className="h-5 w-5 text-neutral-500" />
            Your learning plan
          </span>
          <ChevronRightIcon className="h-4 w-4 text-neutral-400" />
        </Link>
        <Link
          href="/trends"
          className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-neutral-50"
        >
          <span className="flex items-center gap-2.5 text-[15px] font-medium text-foreground">
            <TrendingUpIcon className="h-5 w-5 text-neutral-500" />
            Progress trends
          </span>
          <ChevronRightIcon className="h-4 w-4 text-neutral-400" />
        </Link>
      </section>
    </Card>
  );
}
