import * as mock from "./mock-data";
import type {
  DashboardData,
  LearningPlan,
  OutcomeDetail,
  OutcomeTrend,
  Quiz,
  QuizQuestion,
  QuizResult,
  Student,
} from "./types";

// ---------------------------------------------------------------------------
// API layer.
//
// Every screen talks to the backend through this module only. Right now each
// function resolves the mock fixtures in lib/mock-data.ts. When the backend at
// NEXT_PUBLIC_API_BASE_URL is ready, swap the bodies for real `fetch` calls —
// the return types are already the contract.
// ---------------------------------------------------------------------------

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5001/api";

const LATENCY_MS = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

export async function fetchStudent(): Promise<Student> {
  // return fetch(`${API_BASE_URL}/me`).then((r) => r.json());
  return delay(mock.student);
}

export async function fetchDashboard(): Promise<DashboardData> {
  // return fetch(`${API_BASE_URL}/dashboard`).then((r) => r.json());
  return delay(mock.dashboard);
}

export async function fetchOutcomeDetail(
  outcomeId: string,
): Promise<OutcomeDetail | null> {
  // return fetch(`${API_BASE_URL}/outcomes/${outcomeId}`).then((r) => r.json());
  return delay(mock.getOutcomeDetail(outcomeId) ?? null);
}

export async function fetchLearningPlan(): Promise<LearningPlan> {
  // return fetch(`${API_BASE_URL}/learning-plan`).then((r) => r.json());
  return delay(mock.learningPlan);
}

export async function regenerateLearningPlan(): Promise<LearningPlan> {
  // return fetch(`${API_BASE_URL}/learning-plan/regenerate`, { method: "POST" }).then((r) => r.json());
  return delay(mock.learningPlan);
}

export async function fetchTrends(): Promise<OutcomeTrend[]> {
  // return fetch(`${API_BASE_URL}/trends`).then((r) => r.json());
  return delay(mock.trends);
}

export async function fetchQuiz(outcomeId: string): Promise<Quiz | null> {
  // return fetch(`${API_BASE_URL}/quizzes?outcome=${outcomeId}`).then((r) => r.json());
  return delay(mock.getQuiz(outcomeId) ?? null);
}

export async function submitQuiz(
  outcomeId: string,
  answers: Record<string, string>,
): Promise<QuizResult> {
  // return fetch(`${API_BASE_URL}/quizzes/${outcomeId}/submit`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ answers }),
  // }).then((r) => r.json());

  const quiz = mock.getQuiz(outcomeId)!;
  const wrong: { question: QuizQuestion; chosenKey: string }[] = [];
  let correct = 0;

  for (const question of quiz.questions) {
    const chosenKey = answers[question.id] ?? "";
    if (chosenKey === question.correctKey) {
      correct += 1;
    } else {
      wrong.push({ question, chosenKey });
    }
  }

  const total = quiz.questions.length;
  // Simple formative model: blend the prior mastery with this attempt's score.
  const attemptPct = Math.round((correct / total) * 100);
  const masteryAfter = Math.round(quiz.masteryBefore * 0.6 + attemptPct * 0.4);

  return delay({
    outcomeName: quiz.outcomeName,
    correct,
    total,
    masteryBefore: quiz.masteryBefore,
    masteryAfter,
    review: wrong,
  });
}
