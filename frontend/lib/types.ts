// Domain types for the Learning Journey Assistant frontend.
// These mirror the shapes the backend API is expected to return.

export interface Student {
  id: string;
  name: string;
  initials: string;
  email: string;
  subjectCode: string; // e.g. "STM3LPP"
  subjectName: string; // e.g. "Linear programming & probability"
}

export type MasteryStatus = "low" | "mid" | "high";

export interface LearningOutcome {
  id: string; // slug, e.g. "simplex-algorithm" / "lo1"
  code?: string; // short label, e.g. "LO1"
  name: string; // full description, e.g. "Simplex algorithm"
  mastery: number; // 0 - 100
}

export interface FeedbackItem {
  id: string;
  comment: string; // the rubric comment / criterion text
  assignment: string; // e.g. "Assignment 1"
  outcomeId: string;
  outcomeName: string;
  score: number; // e.g. 6
  maxScore: number; // e.g. 10
}

export interface Resource {
  id: string;
  title: string;
  kind: "notes" | "example" | "reading";
  href?: string;
}

export interface StudyStrategy {
  id: string;
  title: string; // the technique, e.g. "Retrieval practice"
  why: string; // one-sentence, evidence-based rationale
  how: string; // one concrete action for this outcome
}

export interface OutcomeDetail {
  outcome: LearningOutcome;
  subjectCode: string;
  reasons: FeedbackItem[]; // "Why this score"
  strategies: StudyStrategy[];
  resources: Resource[];
}

export type PlanStepStatus = "todo" | "done";

export interface PlanStep {
  id: string;
  title: string;
  estMinutes: number;
  targetOutcomeName: string;
  status: PlanStepStatus;
  resultNote?: string; // e.g. "scored 4/5"
}

export interface LearningPlan {
  subjectCode: string;
  generatedFrom: string; // short description
  steps: PlanStep[];
}

export interface TrendPoint {
  label: string; // e.g. "Assignment 1"
  value: number; // 0 - 100
}

export interface OutcomeTrend {
  outcomeId: string;
  outcomeName: string;
  series: TrendPoint[];
  deltaSinceLast: number; // signed, percentage points
}

export interface DashboardData {
  student: Student;
  overallMastery: number;
  outcomesTracked: number;
  quizzesCompleted: number;
  outcomes: LearningOutcome[];
  recentFeedback: FeedbackItem[];
}

export interface QuizOption {
  key: string; // "A" | "B" | "C" | "D"
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctKey: string;
  reviewLabel: string; // short label used on the results screen
}

export interface Quiz {
  outcomeId: string;
  outcomeCode?: string;
  outcomeName: string;
  questions: QuizQuestion[];
  masteryBefore: number;
}

export interface QuizResult {
  outcomeCode?: string;
  outcomeName: string;
  correct: number;
  total: number;
  masteryBefore: number;
  masteryAfter: number;
  review: { question: QuizQuestion; chosenKey: string }[];
}
