import * as mock from "./mock-data";
import { API_BASE_URL, getSession, signOut } from "./auth";
import { reflectionSteps } from "./reflections";
import { deriveStrategies } from "./strategies";
import type {
  AiGapPlan,
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

export { API_BASE_URL };

const DEMO_SUBJECT_CODE = "CSE3CAP";

/** The signed-in student's ID (from the login session). */
function currentStudentId(): string {
  const session = getSession();
  if (!session) {
    throw new Error("Not signed in");
  }
  return session.studentId;
}

function authHeaders(): Record<string, string> {
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
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
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders(),
  });

  // Expired or invalid login: send the student back to the sign-in screen.
  if (res.status === 401 || res.status === 422) {
    signOut();
  }

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
    getJson<RawStudent>(`/students/${currentStudentId()}`),
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
    getJson<RawStudent>(`/students/${currentStudentId()}`),

    getJson<RawMasteryScore[]>(
      `/students/${currentStudentId()}/mastery`,
    ),

    getJson<RawFeedback[]>(
      `/students/${currentStudentId()}/feedback`,
    ),

    getJson<RawSubject>(
      `/subjects/${DEMO_SUBJECT_CODE}`,
    ),

    getJson<RawQuizAttempt[]>(
      `/students/${currentStudentId()}/quiz-attempts`,
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

  const [subjectData, masteryData, feedbackData] =
    await Promise.all([
      getJson<RawSubject>(
        `/subjects/${DEMO_SUBJECT_CODE}`,
      ),

      getJson<RawMasteryScore[]>(
        `/students/${currentStudentId()}/mastery`,
      ),

      getJson<RawFeedback[]>(
        `/students/${currentStudentId()}/feedback?lo_code=${encodeURIComponent(
          loCode,
        )}`,
      ),
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

  return {
    outcome: {
      id: outcomeId,
      code: lo.lo_code,
      name: lo.description,
      mastery: Math.round(masteryScore?.score ?? 0),
    },

    subjectCode: subjectData.code,

    reasons,

    strategies: deriveStrategies(reasons),

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
        `/subjects/${DEMO_SUBJECT_CODE}`,
      ),

      getJson<RawMasteryScore[]>(
        `/students/${currentStudentId()}/mastery`,
      ),

      getJson<RawFeedback[]>(
        `/students/${currentStudentId()}/feedback`,
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

interface RawHistoryPoint {
  label: string;
  title: string;
  kind: "assessment" | "quiz";
  date: string | null;
  value: number;
}

interface RawOutcomeHistory {
  lo_code: string;
  lo_description: string;
  points: RawHistoryPoint[];
}

/**
 * Real progress for each outcome: mastery after each marked assessment,
 * then after each completed quiz.
 */
export async function fetchTrends(): Promise<OutcomeTrend[]> {
  const history = await getJson<RawOutcomeHistory[]>(
    `/students/${currentStudentId()}/mastery/history`,
  );

  return history.map((item) => {
    const series = item.points.map((point) => ({
      label: point.label,
      value: Math.round(point.value),
    }));
    const last = series.at(-1)?.value ?? 0;
    const previous = series.at(-2)?.value ?? last;

    return {
      outcomeId: item.lo_code.toLowerCase(),
      outcomeCode: item.lo_code,
      outcomeName: item.lo_description,
      series,
      deltaSinceLast: last - previous,
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
        `/subjects/${DEMO_SUBJECT_CODE}`,
      ),

      getJson<RawMasteryScore[]>(
        `/students/${currentStudentId()}/mastery`,
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

interface RawAdaptiveQuiz {
  lo_code: string;
  lo_description: string;
  mastery: number;
  difficulty: "foundational" | "intermediate" | "advanced";
  focus_areas: string[];
  questions: QuizQuestion[];
}

export async function fetchQuiz(
  outcomeId: string,
): Promise<Quiz | null> {
  const resolved =
    await resolveOutcome(outcomeId);

  if (!resolved) {
    return null;
  }

  // Questions are generated by the AI from this outcome, the student's
  // feedback and knowledge gaps, at a difficulty matched to their mastery.
  try {
    const generated = await getJson<RawAdaptiveQuiz>(
      `/students/${currentStudentId()}/quiz?lo_code=${encodeURIComponent(
        resolved.code,
      )}`,
    );

    return {
      outcomeId,
      outcomeCode: resolved.code,
      outcomeName: resolved.name,
      masteryBefore: resolved.mastery,
      questions: generated.questions,
      source: "ai",
      difficulty: generated.difficulty,
      focusAreas: generated.focus_areas,
    };
  } catch {
    // AI unavailable: fall back to the general study-skills questions.
    return {
      outcomeId,
      outcomeCode: resolved.code,
      outcomeName: resolved.name,
      masteryBefore: resolved.mastery,
      questions: mock.genericQuizQuestions,
      source: "sample",
    };
  }
}

// ---------------------------------------------------------------------------
// SUBMIT QUIZ
// ---------------------------------------------------------------------------

export async function submitQuiz(
  quiz: Quiz,
  answers: Record<string, string>,
): Promise<QuizResult> {
  const wrong: {
    question: QuizQuestion;
    chosenKey: string;
  }[] = [];

  let correct = 0;

  for (const question of quiz.questions) {
    const chosenKey =
      answers[question.id] ?? "";

    if (
      chosenKey === question.correctKey
    ) {
      correct += 1;
    } else {
      wrong.push({
        question,
        chosenKey,
      });
    }
  }

  const total = quiz.questions.length;

  if (!quiz.outcomeCode) {
    throw new Error(
      "Could not resolve learning outcome",
    );
  }

  // Save the completed quiz to the backend.
  // Backend also recalculates mastery.
  const response = await fetch(
    `${API_BASE_URL}/students/${currentStudentId()}/quiz-attempts`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },

      body: JSON.stringify({
        lo_code: quiz.outcomeCode,
        score: correct,
        total_questions: total,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      "Failed to save quiz attempt",
    );
  }

  const result = await response.json();

  const attempt = result.data;

  return {
    outcomeCode: quiz.outcomeCode,
    outcomeName: quiz.outcomeName,
    correct,
    total,

    // These now come directly from the backend.
    masteryBefore:
      Math.round(attempt.mastery_before),

    masteryAfter:
      Math.round(attempt.mastery_after),

    review: wrong,
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
    `/students/${currentStudentId()}/knowledge-gaps`,
  );
}
// ---------------------------------------------------------------------------
// AI STUDY PLAN (LLM)
// ---------------------------------------------------------------------------

/**
 * Ask the AI for a personalised study plan for each knowledge gap.
 * Can take several seconds.
 */
export async function fetchAiStudyPlan(): Promise<AiGapPlan[]> {
  const data = await getJson<{ recommendations: AiGapPlan[] }>(
    `/students/${currentStudentId()}/ai-recommendations`,
  );

  // The analyser can report the same gap twice; keep one plan per gap.
  const seen = new Set<string>();
  return data.recommendations.filter((item) => {
    const key = `${item.lo_code}|${item.knowledge_gap}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
