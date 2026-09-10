import * as mock from "./mock-data";
import type {
  DashboardData,
  FeedbackItem,
  LearningOutcome,
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
// Every screen talks to the backend through this module only.
//
// Migrated to the real backend: fetchDashboard, fetchOutcomeDetail.
// Still mocked (no backend endpoint yet): student profile, learning plan,
// trends, quizzes. Those resolve fixtures from lib/mock-data.ts.
// ---------------------------------------------------------------------------

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5001/api";

// TODO(LJAB22-42): derive these from the authenticated session instead of
// hardcoding the demo student / subject.
const DEMO_STUDENT_ID = "S001";
const DEMO_SUBJECT_CODE = "CSE3CAP";

const LATENCY_MS = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

// --- raw backend shapes (envelope is always { data: ... }) ----------------

interface RawStudent {
  id: string;
  name: string;
  email: string;
}

interface RawLearningOutcome {
  id: number;
  lo_code: string;
  description: string;
}

interface RawAssessment {
  id: number;
  title: string;
  max_marks: number;
  due_date: string | null;
}

interface RawSubject {
  code: string;
  name: string;
  description: string;
  learning_outcomes: RawLearningOutcome[];
  assessments: RawAssessment[];
}

interface RawMasteryScore {
  lo_code: string | null;
  lo_id: number;
  score: number;
}

interface RawFeedback {
  id: number;
  assessment_id: number;
  lo_code: string | null;
  comment: string | null;
  score: number | null;
}

/** GET a `{ data: T }` envelope, throwing a helpful error on any non-2xx. */
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${path}`);
  }
  const body = (await res.json()) as { data: T };
  return body.data;
}

// --- shared mappers ------------------------------------------------------

/** Route/param-safe id for a learning outcome (e.g. "LO1" -> "lo1"). */
function outcomeSlug(loCode: string): string {
  return loCode.toLowerCase();
}

/** "Aisha Khan" -> "AK" */
function initialsFor(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function mapFeedback(
  raw: RawFeedback[],
  assessmentsById: Map<number, RawAssessment>,
  outcomeNameByCode: Map<string, string>,
): FeedbackItem[] {
  return raw.map((item, index) => {
    const assessment = assessmentsById.get(item.assessment_id);
    const loCode = item.lo_code ?? "";
    return {
      id: String(item.id ?? index),
      comment: item.comment ?? "Assessment feedback",
      assignment: assessment?.title ?? "Assessment",
      outcomeId: loCode ? outcomeSlug(loCode) : "unknown",
      outcomeName: outcomeNameByCode.get(loCode.toUpperCase()) ?? loCode ?? "Learning outcome",
      // Rubric score is stored against the parent assessment's max marks.
      score: Math.round(item.score ?? 0),
      maxScore: assessment?.max_marks ?? 100,
    };
  });
}

// --- endpoints ---------------------------------------------------------------

export async function fetchStudent(): Promise<Student> {
  const [studentData, subjectData] = await Promise.all([
    getJson<RawStudent>(`/students/${DEMO_STUDENT_ID}`),
    getJson<RawSubject>(`/subjects/${DEMO_SUBJECT_CODE}`),
  ]);

  return {
    id: studentData.id,
    name: studentData.name,
    initials: initialsFor(studentData.name),
    email: studentData.email,
    subjectCode: subjectData.code,
    subjectName: subjectData.name,
  };
}

export async function fetchDashboard(): Promise<DashboardData> {
  const [studentData, masteryData, feedbackData, subjectData] =
    await Promise.all([
      getJson<RawStudent>(`/students/${DEMO_STUDENT_ID}`),
      getJson<RawMasteryScore[]>(`/students/${DEMO_STUDENT_ID}/mastery`),
      getJson<RawFeedback[]>(`/students/${DEMO_STUDENT_ID}/feedback`),
      getJson<RawSubject>(`/subjects/${DEMO_SUBJECT_CODE}`),
    ]);

  const outcomeNameByCode = new Map(
    subjectData.learning_outcomes.map((lo) => [
      lo.lo_code.toUpperCase(),
      lo.description,
    ]),
  );
  const assessmentsById = new Map(
    subjectData.assessments.map((a) => [a.id, a]),
  );

  const outcomes: LearningOutcome[] = masteryData.map((item) => {
    const code = item.lo_code ?? "";
    return {
      id: outcomeSlug(code || `lo-${item.lo_id}`),
      code: code || undefined,
      name:
        outcomeNameByCode.get(code.toUpperCase()) ?? (code || "Learning outcome"),
      mastery: Math.round(item.score),
    };
  });

  const overallMastery =
    masteryData.length > 0
      ? Math.round(
          masteryData.reduce((sum, item) => sum + item.score, 0) /
            masteryData.length,
        )
      : 0;

  const recentFeedback = mapFeedback(
    feedbackData.slice(0, 3),
    assessmentsById,
    outcomeNameByCode,
  );

  return {
    student: {
      id: studentData.id,
      name: studentData.name,
      initials: initialsFor(studentData.name),
      email: studentData.email,
      subjectCode: subjectData.code,
      subjectName: subjectData.name,
    },
    overallMastery,
    outcomesTracked: outcomes.length,
    // TODO(LJAB22-49 / quiz backend): no quiz-history endpoint yet.
    quizzesCompleted: 0,
    outcomes,
    recentFeedback,
  };
}

export async function fetchOutcomeDetail(
  outcomeId: string,
): Promise<OutcomeDetail | null> {
  const loCode = outcomeId.toUpperCase();

  const [subjectData, masteryData, feedbackData] = await Promise.all([
    getJson<RawSubject>(`/subjects/${DEMO_SUBJECT_CODE}`),
    getJson<RawMasteryScore[]>(`/students/${DEMO_STUDENT_ID}/mastery`),
    getJson<RawFeedback[]>(
      `/students/${DEMO_STUDENT_ID}/feedback?lo_code=${encodeURIComponent(loCode)}`,
    ),
  ]);

  const lo = subjectData.learning_outcomes.find(
    (item) => item.lo_code.toUpperCase() === loCode,
  );
  if (!lo) return null;

  const outcomeNameByCode = new Map(
    subjectData.learning_outcomes.map((item) => [
      item.lo_code.toUpperCase(),
      item.description,
    ]),
  );
  const assessmentsById = new Map(
    subjectData.assessments.map((a) => [a.id, a]),
  );
  const masteryScore = masteryData.find(
    (item) => (item.lo_code ?? "").toUpperCase() === loCode,
  );

  return {
    outcome: {
      id: outcomeId,
      code: lo.lo_code,
      name: lo.description,
      mastery: Math.round(masteryScore?.score ?? 0),
    },
    subjectCode: subjectData.code,
    reasons: mapFeedback(feedbackData, assessmentsById, outcomeNameByCode),
    // No resources/content endpoint yet — see LJAB22-45 (Moodle integration).
    resources: [],
  };
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
