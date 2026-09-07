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
  const studentId = "S001";
  const subjectCode = "CSE3CAP";

  const [
    studentResponse,
    masteryResponse,
    feedbackResponse,
    subjectResponse,
  ] = await Promise.all([
    fetch(`${API_BASE_URL}/students/${studentId}`),
    fetch(`${API_BASE_URL}/students/${studentId}/mastery`),
    fetch(`${API_BASE_URL}/students/${studentId}/feedback`),
    fetch(`${API_BASE_URL}/subjects/${subjectCode}`),
  ]);

  if (
    !studentResponse.ok ||
    !masteryResponse.ok ||
    !feedbackResponse.ok ||
    !subjectResponse.ok
  ) {
    throw new Error("Failed to load dashboard data");
  }

  const studentJson = await studentResponse.json();
  const masteryJson = await masteryResponse.json();
  const feedbackJson = await feedbackResponse.json();
  const subjectJson = await subjectResponse.json();

  const studentData = studentJson.data;
  const masteryData = masteryJson.data;
  const feedbackData = feedbackJson.data ?? [];
  const subjectData = subjectJson.data;

  const outcomes = masteryData.map(
    (item: {
      lo_code: string;
      lo_id: number;
      score: number;
    }) => {
      const matchingOutcome = subjectData.learning_outcomes.find(
        (lo: { lo_code: string; description: string }) =>
          lo.lo_code === item.lo_code,
      );

      return {
        id: item.lo_code.toLowerCase(),
        name: matchingOutcome?.description ?? item.lo_code,
        mastery: Math.round(item.score),
      };
    },
  );

  const overallMastery =
    masteryData.length > 0
      ? Math.round(
          masteryData.reduce(
            (sum: number, item: { score: number }) => sum + item.score,
            0,
          ) / masteryData.length,
        )
      : 0;

  const recentFeedback = feedbackData.slice(0, 3).map(
    (
      item: {
        id?: number;
        comment?: string;
        feedback?: string;
        assessment_name?: string;
        lo_code?: string;
        score?: number;
        max_score?: number;
      },
      index: number,
    ) => {
      const matchingOutcome = subjectData.learning_outcomes.find(
        (lo: { lo_code: string; description: string }) =>
          lo.lo_code === item.lo_code,
      );

      return {
        id: String(item.id ?? index),
        comment: item.comment ?? item.feedback ?? "Assessment feedback",
        assignment: item.assessment_name ?? "Assessment",
        outcomeId: (item.lo_code ?? "unknown").toLowerCase(),
        outcomeName:
          matchingOutcome?.description ??
          item.lo_code ??
          "Learning Outcome",
        score: item.score ?? 0,
        maxScore: item.max_score ?? 100,
      };
    },
  );

  return {
    student: {
      id: studentData.id,
      name: studentData.name,
      initials: studentData.name
        .split(" ")
        .map((part: string) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      email: studentData.email,
      subjectCode: subjectData.code,
      subjectName: subjectData.name,
    },
    overallMastery,
    outcomesTracked: outcomes.length,
    quizzesCompleted: 0,
    outcomes,
    recentFeedback,
  };
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
