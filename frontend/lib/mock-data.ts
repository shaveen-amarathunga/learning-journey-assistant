import type {
  DashboardData,
  LearningPlan,
  OutcomeDetail,
  OutcomeTrend,
  Quiz,
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

const OUTCOME_DETAILS: Record<string, Omit<OutcomeDetail, "subjectCode">> = {
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

const QUIZZES: Record<string, Quiz> = {
  "simplex-algorithm": {
    outcomeId: "simplex-algorithm",
    outcomeName: "Simplex algorithm",
    masteryBefore: 40,
    questions: [
      {
        id: "q1",
        prompt:
          "In the Simplex method, a basic feasible solution corresponds to which geometric feature of the feasible region?",
        options: [
          { key: "A", text: "A point in the interior of the region" },
          { key: "B", text: "A vertex (corner point) of the region" },
          { key: "C", text: "An edge joining two vertices" },
          { key: "D", text: "The centroid of the region" },
        ],
        correctKey: "B",
        reviewLabel: "Basic feasible solutions and corner points",
      },
      {
        id: "q2",
        prompt:
          "In the Simplex algorithm, how is the entering variable (pivot column) chosen when minimising the objective function?",
        options: [
          { key: "A", text: "The column with the smallest coefficient in the objective row" },
          { key: "B", text: "The column with the most negative coefficient in the objective row" },
          { key: "C", text: "The column with the largest right-hand side value" },
          { key: "D", text: "Any non-basic variable, chosen at random" },
        ],
        correctKey: "B",
        reviewLabel: "Choosing the entering variable in the Simplex algorithm",
      },
      {
        id: "q3",
        prompt: "The ratio test in the Simplex method is used to determine the:",
        options: [
          { key: "A", text: "Entering variable" },
          { key: "B", text: "Leaving variable (pivot row)" },
          { key: "C", text: "Optimal objective value" },
          { key: "D", text: "Number of iterations required" },
        ],
        correctKey: "B",
        reviewLabel: "Purpose of the ratio test",
      },
      {
        id: "q4",
        prompt: "A Simplex tableau has reached the optimal solution when:",
        options: [
          { key: "A", text: "All right-hand side values are positive" },
          { key: "B", text: "No negative coefficients remain in the objective row (for minimisation)" },
          { key: "C", text: "Every variable is basic" },
          { key: "D", text: "The pivot element equals 1" },
        ],
        correctKey: "B",
        reviewLabel: "Recognising the optimal tableau",
      },
      {
        id: "q5",
        prompt: "Degeneracy in the Simplex method occurs when:",
        options: [
          { key: "A", text: "A basic variable takes the value zero" },
          { key: "B", text: "The problem has no feasible solution" },
          { key: "C", text: "The objective function is unbounded" },
          { key: "D", text: "Two constraints are identical" },
        ],
        correctKey: "A",
        reviewLabel: "Identifying a degenerate basic feasible solution",
      },
    ],
  },
};

// --- accessors ------------------------------------------------------------

export function getOutcomeDetail(outcomeId: string): OutcomeDetail | undefined {
  const detail = OUTCOME_DETAILS[outcomeId];
  return detail ? { ...detail, subjectCode: "STM3LPP" } : undefined;
}

export function getQuiz(outcomeId: string): Quiz | undefined {
  return QUIZZES[outcomeId] ?? QUIZZES["simplex-algorithm"];
}

export function getTrend(outcomeId: string): OutcomeTrend | undefined {
  return trends.find((t) => t.outcomeId === outcomeId);
}
