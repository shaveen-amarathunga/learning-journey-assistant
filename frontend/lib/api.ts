// Thin client for the Learning Journey Assistant Flask API.
// The base URL is inlined at build time (see NEXT_PUBLIC_API_URL in .env.example).

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5001"
).replace(/\/$/, "");

export type StudentSummary = { id: string; name: string; email: string };

export type MasteryScore = { lo_code: string; lo_id: number; score: number; last_updated: string };

export type Feedback = {
  id: number;
  assessment_id: number;
  lo_code: string;
  score: number;
  comment: string;
  created_at: string;
};

export type LearningOutcome = { id: number; lo_code: string; description: string };

export type Assessment = { id: number; title: string; due_date: string; max_marks: number };

export type Subject = {
  code: string;
  name: string;
  description: string;
  learning_outcomes: LearningOutcome[];
  assessments: Assessment[];
};

export type KnowledgeGap = {
  lo_code: string;
  knowledge_gap: string;
  recommendation: string;
  feedback: string;
  score: number;
};

export type AiPlan = {
  explanation?: string;
  learning_activities?: string[];
  practical_exercise?: string;
  study_priority?: string;
  error?: string;
};

export type AiRecommendation = KnowledgeGap & { ai_recommendation: AiPlan };

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error ?? body.msg ?? `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

export const api = {
  students: () => request<{ data: StudentSummary[] }>("/api/students").then((r) => r.data),

  login: (student_id: string, password: string) =>
    request<{ access_token: string; student_id: string; name: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ student_id, password }),
    }),

  subjects: () => request<{ data: { code: string }[] }>("/api/subjects").then((r) => r.data),

  subject: (code: string) => request<{ data: Subject }>(`/api/subjects/${code}`).then((r) => r.data),

  mastery: (id: string, token: string) =>
    request<{ data: MasteryScore[] }>(`/api/students/${id}/mastery`, { token }).then((r) => r.data),

  recalculate: (id: string, token: string) =>
    request(`/api/students/${id}/mastery/recalculate`, { method: "POST", token }),

  feedback: (id: string, token: string) =>
    request<{ data: Feedback[] }>(`/api/students/${id}/feedback`, { token }).then((r) => r.data),

  knowledgeGaps: (id: string) =>
    request<{ data: { knowledge_gaps: KnowledgeGap[] } }>(`/api/students/${id}/knowledge-gaps`).then(
      (r) => r.data.knowledge_gaps,
    ),

  aiRecommendations: (id: string) =>
    request<{ data: { recommendations: AiRecommendation[] } }>(
      `/api/students/${id}/ai-recommendations`,
    ).then((r) => r.data.recommendations),
};
