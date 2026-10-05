"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AiRecommendation,
  api,
  ApiError,
  Feedback,
  KnowledgeGap,
  MasteryScore,
  Subject,
} from "@/lib/api";
import type { Session } from "@/app/page";

type Data = {
  subject: Subject | null;
  mastery: MasteryScore[];
  feedback: Feedback[];
  gaps: KnowledgeGap[] | null; // null when the analyser request failed
};

function band(score: number) {
  if (score >= 75) return { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" };
  if (score >= 50) return { label: "Developing", bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" };
  return { label: "Needs work", bar: "bg-red-500", text: "text-red-700 dark:text-red-400" };
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

async function fetchDashboard(studentId: string, token: string): Promise<Data> {
  const subjectCode = (await api.subjects())[0]?.code;
  const [subject, mastery, feedback, gaps] = await Promise.all([
    subjectCode ? api.subject(subjectCode) : Promise.resolve(null),
    api.mastery(studentId, token).then(async (scores) => {
      if (scores.length) return scores;
      // No scores yet — compute them from the student's feedback.
      await api.recalculate(studentId, token);
      return api.mastery(studentId, token);
    }),
    api.feedback(studentId, token),
    api.knowledgeGaps(studentId).catch(() => null),
  ]);
  return { subject, mastery, feedback, gaps };
}

export default function Dashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { studentId, token, name } = session;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetchDashboard(studentId, token).then(setData, (err) => {
      if (err instanceof ApiError && (err.status === 401 || err.status === 422)) {
        onLogout(); // expired or invalid token
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
    });
  }, [studentId, token, onLogout]);

  useEffect(load, [load]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              LJ
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Learning Journey</p>
              <p className="text-xs text-muted">{data?.subject?.name ?? "Loading…"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:inline">
              {name} <span className="text-muted">· {studentId}</span>
            </span>
            <button onClick={onLogout} className="btn-secondary shrink-0 whitespace-nowrap">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6">
        {error ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => {
                setError("");
                load();
              }}
              className="btn-primary mt-4"
            >
              Try again
            </button>
          </div>
        ) : !data ? (
          <p className="py-20 text-center text-sm text-muted">Loading your progress…</p>
        ) : (
          <DashboardBody data={data} studentId={studentId} name={name} />
        )}
      </main>
    </div>
  );
}

function DashboardBody({ data, studentId, name }: { data: Data; studentId: string; name: string }) {
  const { subject, mastery, feedback, gaps } = data;

  const outcomes = useMemo(() => {
    const byCode = new Map(subject?.learning_outcomes.map((lo) => [lo.lo_code, lo.description]));
    return [...mastery]
      .sort((a, b) => a.lo_code.localeCompare(b.lo_code))
      .map((m) => ({ ...m, description: byCode.get(m.lo_code) ?? "" }));
  }, [mastery, subject]);

  const average = outcomes.length
    ? outcomes.reduce((sum, o) => sum + o.score, 0) / outcomes.length
    : 0;
  const weakest = outcomes.reduce<(typeof outcomes)[number] | null>(
    (min, o) => (!min || o.score < min.score ? o : min),
    null,
  );

  // The analyser can report the same gap more than once; keep the lowest-scoring instance.
  const uniqueGaps = useMemo(() => {
    const seen = new Map<string, KnowledgeGap>();
    for (const g of gaps ?? []) {
      const key = `${g.lo_code}|${g.knowledge_gap}`;
      const prev = seen.get(key);
      if (!prev || g.score < prev.score) seen.set(key, g);
    }
    return [...seen.values()].sort((a, b) => a.score - b.score);
  }, [gaps]);

  return (
    <>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Hi {name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-sm text-muted">Here&apos;s where you stand across your learning outcomes.</p>
      </section>

      <section className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-4">
        <Stat label="Average mastery" value={`${average.toFixed(0)}%`} />
        <Stat label="Learning outcomes" value={String(outcomes.length)} />
        <Stat label="Feedback received" value={String(feedback.length)} />
        <Stat label="Focus area" value={weakest?.lo_code ?? "—"} hint={weakest ? `${weakest.score.toFixed(0)}%` : undefined} />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Mastery by learning outcome</h2>
        <ul className="space-y-4">
          {outcomes.map((o) => {
            const b = band(o.score);
            return (
              <li key={o.lo_code}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="min-w-0 text-sm">
                    <span className="font-semibold">{o.lo_code}</span>
                    <span className="text-muted"> — {o.description}</span>
                  </p>
                  <p className="shrink-0 text-sm tabular-nums">
                    <span className={`mr-2 text-xs font-medium ${b.text}`}>{b.label}</span>
                    <span className="font-semibold">{o.score.toFixed(0)}%</span>
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-track">
                  <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${Math.min(100, o.score)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 font-semibold">Knowledge gaps</h2>
          <p className="mb-4 text-xs text-muted">Identified from your lecturers&apos; feedback.</p>
          {gaps === null ? (
            <p className="text-sm text-red-600 dark:text-red-400">Couldn&apos;t load knowledge gaps right now.</p>
          ) : uniqueGaps.length ? (
            <ul className="space-y-3">
              {uniqueGaps.map((g) => (
                <li key={`${g.lo_code}-${g.knowledge_gap}`} className="rounded-lg border border-line p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="min-w-0 text-sm font-medium">{g.knowledge_gap}</p>
                    <span className="rounded bg-track px-1.5 py-0.5 text-xs font-medium">{g.lo_code}</span>
                  </div>
                  <p className="text-sm text-muted">{g.recommendation}</p>
                  <p className="mt-2 border-l-2 border-line pl-2 text-xs italic text-muted">“{g.feedback}”</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No gaps found — nice work! 🎉</p>
          )}
        </section>

        <AiPlan studentId={studentId} hasGaps={uniqueGaps.length > 0} />
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Feedback history</h2>
        <FeedbackHistory feedback={feedback} subject={subject} />
      </section>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-2xl font-semibold tabular-nums">
        {value}
        {hint && <span className="text-sm font-normal text-muted">{hint}</span>}
      </p>
    </div>
  );
}

function AiPlan({ studentId, hasGaps }: { studentId: string; hasGaps: boolean }) {
  const [plans, setPlans] = useState<AiRecommendation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      setPlans(await api.aiRecommendations(studentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a plan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 font-semibold">AI study plan</h2>
      <p className="mb-4 text-xs text-muted">Personalised activities for each knowledge gap.</p>

      {!plans && (
        <button onClick={generate} disabled={busy || !hasGaps} className="btn-primary">
          {busy ? "Generating… (this can take a moment)" : "Generate my study plan"}
        </button>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          The AI service isn&apos;t available right now. {error.includes("api_key") ? "(No API key configured on the server.)" : ""}
        </p>
      )}

      {plans && (
        <ul className="space-y-4">
          {plans.map((p, i) => {
            const ai = p.ai_recommendation;
            return (
              <li key={i} className="rounded-lg border border-line p-3">
                <p className="text-sm font-medium">
                  {p.lo_code} · {p.knowledge_gap}
                </p>
                {ai.error ? (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">Couldn&apos;t generate this one.</p>
                ) : (
                  <div className="mt-2 space-y-2 text-sm">
                    {ai.study_priority && <p className="font-medium text-indigo-700 dark:text-indigo-300">{ai.study_priority}</p>}
                    {ai.explanation && <p className="text-muted">{ai.explanation}</p>}
                    {ai.learning_activities?.length ? (
                      <ul className="list-disc space-y-1 pl-5">
                        {ai.learning_activities.map((a, j) => (
                          <li key={j}>{a}</li>
                        ))}
                      </ul>
                    ) : null}
                    {ai.practical_exercise && (
                      <p>
                        <span className="font-medium">Try this: </span>
                        {ai.practical_exercise}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FeedbackHistory({ feedback, subject }: { feedback: Feedback[]; subject: Subject | null }) {
  const groups = useMemo(() => {
    const titles = new Map(subject?.assessments.map((a) => [a.id, a]));
    const byAssessment = new Map<number, Feedback[]>();
    for (const f of feedback) {
      byAssessment.set(f.assessment_id, [...(byAssessment.get(f.assessment_id) ?? []), f]);
    }
    return [...byAssessment.entries()]
      .map(([id, items]) => ({
        id,
        title: titles.get(id)?.title ?? `Assessment ${id}`,
        date: items[0].created_at,
        items: items.sort((a, b) => a.lo_code.localeCompare(b.lo_code)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [feedback, subject]);

  if (!groups.length) return <p className="text-sm text-muted">No feedback yet.</p>;

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.id}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="min-w-0 text-sm font-semibold">{g.title}</h3>
            <span className="shrink-0 text-xs text-muted">{formatDate(g.date)}</span>
          </div>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {g.items.map((f) => (
              <li key={f.id} className="flex gap-3 p-3 text-sm">
                <span className="w-10 shrink-0 font-medium">{f.lo_code}</span>
                <p className="min-w-0 flex-1 text-muted">{f.comment}</p>
                <span className={`shrink-0 font-semibold tabular-nums ${band(f.score).text}`}>
                  {f.score.toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
