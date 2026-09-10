import { deriveStrategies } from "./strategies";
import type {
  DashboardData,
  LearningPlan,
  OutcomeDetail,
  OutcomeTrend,
  QuizQuestion,
  Student,
} from "./types";

// ---------------------------------------------------------------------------
// Mock fixtures. These match the "Alex S. / STM3LPP" walkthrough in the
// design deck. They are the single source of truth until the backend
// (NEXT_PUBLIC_API_BASE_URL) is wired up — see lib/api.ts.
// ---------------------------------------------------------------------------

export const student: Student = {
  id: "S001",
  name: "Alex S.",
  initials: "AS",
  email: "alex.s@latrobe.edu.au",
  subjectCode: "STM3LPP",
  subjectName: "Linear programming & probability",
};

const OUTCOMES = [
  { id: "simplex-algorithm", code: "LO1", name: "Simplex algorithm", mastery: 40 },
  { id: "probability-distributions", code: "LO2", name: "Probability distributions", mastery: 60 },
  { id: "graphical-lp-methods", code: "LO3", name: "Graphical LP methods", mastery: 75 },
];

export const dashboard: DashboardData = {
  student,
  overallMastery: 58,
  outcomesTracked: OUTCOMES.length,
  quizzesCompleted: 2,
  outcomes: OUTCOMES,
  recentFeedback: [
    {
      id: "fb-1",
      comment: "Weak justification of pivot column selection",
      assignment: "Assignment 1",
      outcomeId: "simplex-algorithm",
      outcomeName: "Simplex algorithm",
      score: 6,
      maxScore: 10,
    },
    {
      id: "fb-2",
      comment: "Clear identification of feasible region boundaries",
      assignment: "Assignment 1",
      outcomeId: "graphical-lp-methods",
      outcomeName: "Graphical LP methods",
      score: 9,
      maxScore: 10,
    },
  ],
};

const OUTCOME_DETAILS: Record<
  string,
  Omit<OutcomeDetail, "subjectCode" | "strategies">
> = {
  "simplex-algorithm": {
    outcome: OUTCOMES[0],
    reasons: [
      {
        id: "fb-1",
        comment: "Weak justification of pivot column selection",
        assignment: "Assignment 1",
        outcomeId: "simplex-algorithm",
        outcomeName: "Simplex algorithm",
        score: 6,
        maxScore: 10,
      },
      {
        id: "fb-3",
        comment: "Degenerate basic feasible solution not identified",
        assignment: "Assignment 1",
        outcomeId: "simplex-algorithm",
        outcomeName: "Simplex algorithm",
        score: 5,
        maxScore: 10,
      },
    ],
    resources: [
      { id: "r-1", title: "Week 3 notes — the Simplex algorithm", kind: "notes" },
      { id: "r-2", title: "Corner point theorem — worked example", kind: "example" },
    ],
  },
  "probability-distributions": {
    outcome: OUTCOMES[1],
    reasons: [
      {
        id: "fb-4",
        comment: "Confused probability mass and density functions",
        assignment: "Quiz 1",
        outcomeId: "probability-distributions",
        outcomeName: "Probability distributions",
        score: 6,
        maxScore: 10,
      },
    ],
    resources: [
      { id: "r-3", title: "Week 5 notes — discrete vs continuous distributions", kind: "notes" },
      { id: "r-4", title: "Expected value — worked example", kind: "example" },
    ],
  },
  "graphical-lp-methods": {
    outcome: OUTCOMES[2],
    reasons: [
      {
        id: "fb-5",
        comment: "Minor slip plotting the objective function gradient",
        assignment: "Assignment 1",
        outcomeId: "graphical-lp-methods",
        outcomeName: "Graphical LP methods",
        score: 8,
        maxScore: 10,
      },
    ],
    resources: [
      { id: "r-5", title: "Week 2 notes — graphical solution method", kind: "notes" },
    ],
  },
};

export const learningPlan: LearningPlan = {
  subjectCode: "STM3LPP",
  generatedFrom: "generated from your recent gaps",
  steps: [
    {
      id: "step-1",
      title: "Review Week 3 notes — the Simplex algorithm",
      estMinutes: 20,
      targetOutcomeName: "Simplex algorithm",
      status: "todo",
    },
    {
      id: "step-2",
      title: "Complete practice quiz — Simplex algorithm",
      estMinutes: 10,
      targetOutcomeName: "Simplex algorithm",
      status: "done",
      resultNote: "scored 4/5",
    },
    {
      id: "step-3",
      title: "Revisit the corner point theorem worked example",
      estMinutes: 15,
      targetOutcomeName: "Simplex algorithm",
      status: "todo",
    },
    {
      id: "step-4",
      title: "Attempt Assignment 2 — Simplex practice problems",
      estMinutes: 40,
      targetOutcomeName: "Simplex algorithm",
      status: "todo",
    },
  ],
};

export const trends: OutcomeTrend[] = [
  {
    outcomeId: "simplex-algorithm",
    outcomeName: "Simplex algorithm",
    series: [
      { label: "Assignment 1", value: 30 },
      { label: "Quiz 1", value: 40 },
      { label: "Quiz 2", value: 52 },
    ],
    deltaSinceLast: 12,
  },
  {
    outcomeId: "probability-distributions",
    outcomeName: "Probability distributions",
    series: [
      { label: "Assignment 1", value: 52 },
      { label: "Quiz 1", value: 55 },
      { label: "Quiz 2", value: 60 },
    ],
    deltaSinceLast: 5,
  },
  {
    outcomeId: "graphical-lp-methods",
    outcomeName: "Graphical LP methods",
    series: [
      { label: "Assignment 1", value: 75 },
      { label: "Quiz 1", value: 75 },
      { label: "Quiz 2", value: 75 },
    ],
    deltaSinceLast: 0,
  },
];

// Placeholder practice quiz. Outcome-agnostic questions about using feedback
// and self-regulated study — they read sensibly against any learning outcome.
// Replace with backend-generated, outcome-specific questions once the AI
// quiz-generation layer exists.
export const genericQuizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    prompt:
      "Your assessment feedback points to a specific weakness in this outcome. The most effective first step is to:",
    options: [
      {
        key: "A",
        text: "Re-read the rubric and the marker's comments to pinpoint exactly what was expected",
      },
      { key: "B", text: "Move on to the next topic and come back to it later" },
      { key: "C", text: "Redo the whole assessment from scratch" },
      { key: "D", text: "Assume the marking was too harsh and ignore it" },
    ],
    correctKey: "A",
    reviewLabel: "Turning feedback into a starting point",
  },
  {
    id: "q2",
    prompt:
      "Spreading your revision across several short sessions instead of one long session mainly helps because it:",
    options: [
      { key: "A", text: "Feels less tiring" },
      {
        key: "B",
        text: "Strengthens long-term retention through repeated retrieval",
      },
      { key: "C", text: "Lets you cover more topics at once" },
      { key: "D", text: "Guarantees a higher mark" },
    ],
    correctKey: "B",
    reviewLabel: "Why spaced practice works",
  },
  {
    id: "q3",
    prompt:
      "Which activity is the strongest test of whether you actually understand a concept?",
    options: [
      { key: "A", text: "Re-reading and highlighting your notes" },
      { key: "B", text: "Watching the lecture recording again" },
      {
        key: "C",
        text: "Explaining it from memory, or solving a problem without notes",
      },
      { key: "D", text: "Copying out the textbook definition" },
    ],
    correctKey: "C",
    reviewLabel: "Retrieval practice vs passive review",
  },
  {
    id: "q4",
    prompt: "A good, specific goal for closing a gap in this outcome looks like:",
    options: [
      { key: "A", text: '"Get better at this subject"' },
      { key: "B", text: '"Study more this week"' },
      {
        key: "C",
        text: '"Be able to justify each key decision against a requirement, by Friday"',
      },
      { key: "D", text: '"Read every lecture slide again"' },
    ],
    correctKey: "C",
    reviewLabel: "Setting specific, checkable goals",
  },
  {
    id: "q5",
    prompt: "After a practice attempt, the most useful thing to review is:",
    options: [
      { key: "A", text: "Only the questions you got right" },
      { key: "B", text: "The total score and nothing else" },
      {
        key: "C",
        text: "The questions you got wrong, and why the correct answer is correct",
      },
      { key: "D", text: "How long the quiz took" },
    ],
    correctKey: "C",
    reviewLabel: "Reviewing errors, not just scores",
  },
];

// --- accessors ------------------------------------------------------------

export function getOutcomeDetail(outcomeId: string): OutcomeDetail | undefined {
  const detail = OUTCOME_DETAILS[outcomeId];
  return detail
    ? {
        ...detail,
        subjectCode: "STM3LPP",
        strategies: deriveStrategies(detail.reasons),
      }
    : undefined;
}

export function getTrend(outcomeId: string): OutcomeTrend | undefined {
  return trends.find((t) => t.outcomeId === outcomeId);
}
