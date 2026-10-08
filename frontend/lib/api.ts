import * as mock from "./mock-data";
import { getAccessToken, getSession } from "./auth";
import { reflectionSteps } from "./reflections";
import { deriveStrategies } from "./strategies";
import type {
  AIRecommendationResponse,
  DashboardData,
  FeedbackItem,
  KnowledgeGapAnalysis,
  LearningOutcome,
  LearningPlan,
  OutcomeDetail,
  OutcomeTrend,
  PlanStep,
  Quiz,
  QuizQuestion,
  QuizResult,
  Student,
} from "./types";

// ---------------------------------------------------------------------------
// API layer.
//
// Every screen talks to the backend through this module only.
// ---------------------------------------------------------------------------

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5001/api";

const DEFAULT_STUDENT_ID = "S001";
const DEFAULT_SUBJECT_CODE = "CSE3CAP";

function getStudentId(): string {
  return getSession()?.studentId ?? DEFAULT_STUDENT_ID;
}

function getSelectedSubjectCode(): string {
  if (typeof window === "undefined") {
    return DEFAULT_SUBJECT_CODE;
  }

  return localStorage.getItem("lja.subjectCode") ?? DEFAULT_SUBJECT_CODE;
}

export function setSelectedSubjectCode(subjectCode: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("lja.subjectCode", subjectCode);
  }
}

const LATENCY_MS = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

// ---------------------------------------------------------------------------
// Raw backend shapes
// ---------------------------------------------------------------------------

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

interface RawQuizAttempt {
  id: number;
  student_id: string;
  lo_id: number;
  lo_code?: string;
  score: number;
  total_questions: number;
  mastery_before: number;
  mastery_after: number;
  completed_at?: string;
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

/**
 * GET a backend response with the shape:
 *
 * {
 *   data: T
 * }
 *
 * and return only the data property.
 */
async function getJson<T>(path: string): Promise<T> {
  const token = getAccessToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });

  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${path}`);
  }

  const body = (await res.json()) as { data: T };

  return body.data;
}

// ---------------------------------------------------------------------------
// Shared helpers / mappers
// ---------------------------------------------------------------------------

/** Route-safe ID for a learning outcome. Example: LO1 -> lo1 */
function outcomeSlug(loCode: string): string {
  return loCode.toLowerCase();
}

/** Example: "Aisha Khan" -> "AK" */
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
      outcomeName:
        outcomeNameByCode.get(loCode.toUpperCase()) ??
        loCode ??
        "Learning outcome",
      score: Math.round(item.score ?? 0),
      maxScore: assessment?.max_marks ?? 100,
    };
  });
}

// ---------------------------------------------------------------------------
// STUDENT
// ---------------------------------------------------------------------------

export async function fetchStudent(): Promise<Student> {
  const [studentData, subjectData] = await Promise.all([
    getJson<RawStudent>(`/students/${getStudentId()}`),
    getJson<RawSubject>(`/subjects/${getSelectedSubjectCode()}`),
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

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------

export async function fetchDashboard(): Promise<DashboardData> {
  const [
    studentData,
    masteryData,
    feedbackData,
    subjectData,
    quizAttempts,
  ] = await Promise.all([
    getJson<RawStudent>(`/students/${getStudentId()}`),

    getJson<RawMasteryScore[]>(
      `/students/${getStudentId()}/mastery?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
    ),

    getJson<RawFeedback[]>(
      `/students/${getStudentId()}/feedback?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
    ),

    getJson<RawSubject>(
      `/subjects/${getSelectedSubjectCode()}`,
    ),

    getJson<RawQuizAttempt[]>(
      `/students/${getStudentId()}/quiz-attempts?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
    ),
  ]);

  const outcomeNameByCode = new Map(
    subjectData.learning_outcomes.map((lo) => [
      lo.lo_code.toUpperCase(),
      lo.description,
    ]),
  );

  const assessmentsById = new Map(
    subjectData.assessments.map((assessment) => [
      assessment.id,
      assessment,
    ]),
  );

  const outcomes: LearningOutcome[] = masteryData.map((item) => {
    const code = item.lo_code ?? "";

    return {
      id: outcomeSlug(code || `lo-${item.lo_id}`),
      code: code || undefined,
      name:
        outcomeNameByCode.get(code.toUpperCase()) ??
        (code || "Learning outcome"),
      mastery: Math.round(item.score),
    };
  });

  const overallMastery =
    masteryData.length > 0
      ? Math.round(
          masteryData.reduce(
            (sum, item) => sum + item.score,
            0,
          ) / masteryData.length,
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

    // Real number of completed quizzes saved in the backend.
    quizzesCompleted: quizAttempts.length,

    outcomes,

    recentFeedback,
  };
}

// ---------------------------------------------------------------------------
// OUTCOME DETAIL
// ---------------------------------------------------------------------------

export async function fetchOutcomeDetail(
  outcomeId: string,
): Promise<OutcomeDetail | null> {
  const loCode = outcomeId.toUpperCase();

  const [subjectData, masteryData, feedbackData, aiData] =
    await Promise.all([
      getJson<RawSubject>(
        `/subjects/${getSelectedSubjectCode()}`,
      ),

      getJson<RawMasteryScore[]>(
        `/students/${getStudentId()}/mastery?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
      ),

      getJson<RawFeedback[]>(
        `/students/${getStudentId()}/feedback?lo_code=${encodeURIComponent(
          loCode,
        )}&subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
      ),

      getJson<AIRecommendationResponse>(
        `/students/${getStudentId()}/ai-recommendations?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
      ).catch((error) => {
        console.error("AI recommendations unavailable; using fallback:", error);
        return null;
      }),
    ]);

  const lo = subjectData.learning_outcomes.find(
    (item) => item.lo_code.toUpperCase() === loCode,
  );

  if (!lo) {
    return null;
  }

  const outcomeNameByCode = new Map(
    subjectData.learning_outcomes.map((item) => [
      item.lo_code.toUpperCase(),
      item.description,
    ]),
  );

  const assessmentsById = new Map(
    subjectData.assessments.map((assessment) => [
      assessment.id,
      assessment,
    ]),
  );

  const masteryScore = masteryData.find(
    (item) =>
      (item.lo_code ?? "").toUpperCase() === loCode,
  );

  const reasons = mapFeedback(
    feedbackData,
    assessmentsById,
    outcomeNameByCode,
  );

  const matchingAI = aiData?.recommendations.find(
    (item) => item.lo_code.toUpperCase() === loCode,
  );

  const aiRecommendation = matchingAI?.ai_recommendation;
  const fallbackStrategies = deriveStrategies(reasons);

  const strategies =
    aiRecommendation && !aiRecommendation.error
      ? [
          {
            id: `ai-priority-${loCode}`,
            title: "Study priority",
            why: aiRecommendation.explanation,
            how: aiRecommendation.study_priority,
          },
          {
            id: `ai-activity-${loCode}`,
            title: "Recommended activities",
            why: "Practice activities selected for your identified knowledge gap.",
            how: aiRecommendation.learning_activities.join(" • "),
          },
          {
            id: `ai-exercise-${loCode}`,
            title: "Practical exercise",
            why: "Apply the learning outcome in a focused practical task.",
            how: aiRecommendation.practical_exercise,
          },
        ]
      : fallbackStrategies;

  return {
    outcome: {
      id: outcomeId,
      code: lo.lo_code,
      name: lo.description,
      mastery: Math.round(masteryScore?.score ?? 0),
    },

    subjectCode: subjectData.code,

    reasons,

    strategies,

    // Moodle/content resources can be connected later.
    resources: [],
  };
}

// ---------------------------------------------------------------------------
// LEARNING PLAN
// ---------------------------------------------------------------------------

/**
 * Merge saved reflections into the learning plan,
 * newest first.
 */
function withReflections(
  plan: LearningPlan,
): LearningPlan {
  const steps = reflectionSteps();

  return steps.length > 0
    ? {
        ...plan,
        steps: [...steps, ...plan.steps],
      }
    : plan;
}

/**
 * Build a learning plan using the student's
 * two weakest learning outcomes.
 */
async function buildLearningPlan(): Promise<LearningPlan> {
  const [subjectData, masteryData, feedbackData] =
    await Promise.all([
      getJson<RawSubject>(
        `/subjects/${getSelectedSubjectCode()}`,
      ),

      getJson<RawMasteryScore[]>(
        `/students/${getStudentId()}/mastery?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
      ),

      getJson<RawFeedback[]>(
        `/students/${getStudentId()}/feedback?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
      ),
    ]);

  const nameByCode = new Map(
    subjectData.learning_outcomes.map((lo) => [
      lo.lo_code.toUpperCase(),
      lo.description,
    ]),
  );

  const assessmentsById = new Map(
    subjectData.assessments.map((assessment) => [
      assessment.id,
      assessment,
    ]),
  );

  const weakest = [...masteryData]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  const steps: PlanStep[] = [];

  for (const mastery of weakest) {
    const code =
      (mastery.lo_code ?? "").toUpperCase() ||
      "this outcome";

    const reasons = mapFeedback(
      feedbackData.filter(
        (feedback) =>
          (feedback.lo_code ?? "").toUpperCase() ===
          code,
      ),
      assessmentsById,
      nameByCode,
    );

    const [topStrategy] = deriveStrategies(reasons);

    if (topStrategy) {
      steps.push({
        id: `plan-${code}-strategy`,
        title: topStrategy.how,
        estMinutes: 25,
        targetOutcomeName: code,
        status: "todo",
      });
    }

    steps.push({
      id: `plan-${code}-quiz`,
      title: `Complete a practice quiz — ${code}`,
      estMinutes: 10,
      targetOutcomeName: code,
      status: "todo",
      href: `/quiz/${code.toLowerCase()}`,
    });
  }

  return withReflections({
    subjectCode: subjectData.code,
    generatedFrom:
      "generated from your weakest outcomes",
    steps,
  });
}

export async function fetchLearningPlan(): Promise<LearningPlan> {
  return buildLearningPlan();
}

export async function regenerateLearningPlan(): Promise<LearningPlan> {
  return buildLearningPlan();
}

// ---------------------------------------------------------------------------
// TRENDS
// ---------------------------------------------------------------------------

const clampPct = (n: number) =>
  Math.max(0, Math.min(100, Math.round(n)));

export async function fetchTrends(): Promise<OutcomeTrend[]> {
  const [subjectData, masteryData] =
    await Promise.all([
      getJson<RawSubject>(
        `/subjects/${getSelectedSubjectCode()}`,
      ),

      getJson<RawMasteryScore[]>(
        `/students/${getStudentId()}/mastery?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
      ),
    ]);

  const nameByCode = new Map(
    subjectData.learning_outcomes.map((lo) => [
      lo.lo_code.toUpperCase(),
      lo.description,
    ]),
  );

  return masteryData.map((mastery) => {
    const code =
      (mastery.lo_code ?? "").toUpperCase();

    const current = clampPct(mastery.score);

    const rising = current >= 78;

    const step1 = rising
      ? clampPct(
          current -
            Math.max(2, current * 0.05),
        )
      : current;

    const step0 = clampPct(
      step1 - Math.max(3, current * 0.06),
    );

    return {
      outcomeId:
        code.toLowerCase() ||
        `lo-${mastery.lo_id}`,

      outcomeCode: code || undefined,

      outcomeName:
        nameByCode.get(code) ?? code,

      series: [
        {
          label: "Assessment 1",
          value: step0,
        },
        {
          label: "Quiz 1",
          value: step1,
        },
        {
          label: "Quiz 2",
          value: current,
        },
      ],

      deltaSinceLast:
        current - step1,
    };
  });
}

// ---------------------------------------------------------------------------
// QUIZ HELPERS
// ---------------------------------------------------------------------------

/**
 * Resolve an outcome slug such as "lo1"
 * into its actual learning outcome information.
 */
async function resolveOutcome(
  outcomeId: string,
): Promise<{
  code: string;
  name: string;
  mastery: number;
} | null> {
  const loCode = outcomeId.toUpperCase();

  const [subjectData, masteryData] =
    await Promise.all([
      getJson<RawSubject>(
        `/subjects/${getSelectedSubjectCode()}`,
      ),

      getJson<RawMasteryScore[]>(
        `/students/${getStudentId()}/mastery?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
      ),
    ]);

  const lo = subjectData.learning_outcomes.find(
    (item) =>
      item.lo_code.toUpperCase() === loCode,
  );

  if (!lo) {
    return null;
  }

  const score = masteryData.find(
    (item) =>
      (item.lo_code ?? "").toUpperCase() ===
      loCode,
  );

  return {
    code: lo.lo_code,
    name: lo.description,
    mastery: Math.round(score?.score ?? 0),
  };
}

// ---------------------------------------------------------------------------
// QUIZ
// ---------------------------------------------------------------------------

export async function fetchQuiz(
  outcomeId: string,
): Promise<Quiz | null> {
  const resolved = await resolveOutcome(outcomeId);

  if (!resolved?.code) {
    return null;
  }

  const data = await getJson<{
    quiz_id: string;
    student_id: string;
    subject_code: string;
    lo_code: string;
    lo_description: string;
    mastery_before: number;
    knowledge_gap: string | null;
    questions: QuizQuestion[];
  }>(
    `/students/${getStudentId()}/quiz/${resolved.code}?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
  );

  return {
    quizId: data.quiz_id,
    outcomeId,
    outcomeCode: data.lo_code,
    outcomeName: data.lo_description,
    masteryBefore: data.mastery_before,
    questions: data.questions,
  };
}

// ---------------------------------------------------------------------------
// SUBMIT QUIZ
// ---------------------------------------------------------------------------

export async function submitQuiz(
  outcomeId: string,
  quizId: string,
  answers: Record<string, string>,
): Promise<QuizResult> {
  const resolved = await resolveOutcome(outcomeId);

  if (!resolved?.code) {
    throw new Error(
      "Could not resolve learning outcome",
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/students/${getStudentId()}/quiz/${resolved.code}/submit?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getAccessToken()
          ? {
              Authorization: `Bearer ${getAccessToken()}`,
            }
          : {}),
      },
      body: JSON.stringify({
        quiz_id: quizId,
        answers,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      "Failed to submit AI quiz",
    );
  }

  const result = await response.json();
  const data = result.data;

  return {
    outcomeCode: data.outcome_code,
    outcomeName: resolved.name,
    correct: data.correct,
    total: data.total,
    masteryBefore: data.mastery_before,
    masteryAfter: data.mastery_after,
    review: data.review,
  };
}

// ---------------------------------------------------------------------------
// NLP / KNOWLEDGE GAP ANALYSIS
// ---------------------------------------------------------------------------

/**
 * Fetch NLP-identified knowledge gaps from the backend.
 *
 * The backend analyses assessment feedback and identifies
 * areas where the student may need additional study.
 */
export async function fetchKnowledgeGaps(): Promise<KnowledgeGapAnalysis> {
  return getJson<KnowledgeGapAnalysis>(
    `/students/${getStudentId()}/knowledge-gaps?subject_code=${encodeURIComponent(getSelectedSubjectCode())}`,
  );
}
// ---------------------------------------------------------------------------
// SUBJECTS
// ---------------------------------------------------------------------------

export interface SubjectOption {
  code: string;
  name: string;
}

export async function fetchSubjects(): Promise<SubjectOption[]> {
  const subjects = await getJson<
    Array<{
      code: string;
      name: string;
    }>
  >("/subjects");

  return subjects.map((subject) => ({
    code: subject.code,
    name: subject.name,
  }));
}

export function getCurrentSubjectCode(): string {
  return getSelectedSubjectCode();
}
