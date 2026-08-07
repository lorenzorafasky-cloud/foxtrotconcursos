import { apiRequest } from "./api";

export type QuestionKind = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "DISCURSIVE";

export type CatalogItem = { id: string; name: string };
export type SubjectFilter = CatalogItem & { topics: CatalogItem[] };

export type QuestionFilters = {
  boards: CatalogItem[];
  careers: CatalogItem[];
  subjects: SubjectFilter[];
  institutions: CatalogItem[];
  positions: CatalogItem[];
  kinds: QuestionKind[];
};

export type QuestionAlternative = { id: string; text: string };

export type QuestionSummary = {
  id: string;
  code: string;
  kind: QuestionKind;
  statement: string;
  alternatives?: unknown;
  correctAnswer?: string | null;
  explanation?: string | null;
  year: number;
  board: CatalogItem;
  career: CatalogItem;
  subject: CatalogItem;
  topic?: CatalogItem | null;
  institution: CatalogItem;
  position: CatalogItem;
  sourceExam?: string | null;
  favorites?: Array<{ id: string }>;
  attempts?: Array<{ id: string; selectedAnswer?: string | null; isCorrect?: boolean | null; createdAt: string }>;
};

export type QuestionDetail = QuestionSummary & {
  aiAnswer?: { body: string } | null;
  answers: Array<{ id: string; body: string; isOfficial: boolean; upvotes: number; user: { nickname: string } }>;
  submissions?: Array<{ id: string; body: string; finalScore?: number | null; finalFeedback?: string | null; createdAt: string }>;
};

export type QuestionAttempt = {
  id: string;
  selectedAnswer?: string | null;
  isCorrect?: boolean | null;
  timeSeconds: number;
  createdAt: string;
  pendingCorrection?: boolean;
};

export type PerformanceSubject = {
  subjectId: string;
  subject: string;
  total: number;
  correct: number;
  pending: number;
  accuracy: number;
  averageTimeSeconds: number;
  topics: Array<{
    topicId?: string | null;
    topic: string;
    total: number;
    correct: number;
    pending: number;
    accuracy: number;
    averageTimeSeconds: number;
  }>;
};

export type AttemptHistory = QuestionAttempt & {
  question: QuestionSummary;
  simulation?: { id: string; title: string } | null;
};

export type SimulationListItem = {
  id: string;
  title: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  questionCount: number;
  createdAt: string;
  submittedAt?: string | null;
  questions: Array<{ id: string }>;
  attempts: Array<{ id: string; isCorrect?: boolean | null }>;
};

export type SimulationDetail = {
  id: string;
  title: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  questionCount: number;
  questions: Array<{ id: string; position: number; questionId: string; question: QuestionSummary }>;
  results?: SimulationResults;
};

export type SimulationResults = {
  id: string;
  title: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  questionCount: number;
  answered: number;
  correct: number;
  pending: number;
  accuracy: number;
  submittedAt?: string | null;
  items: Array<{
    id: string;
    position: number;
    question: QuestionSummary;
    attempt?: QuestionAttempt | null;
    essaySubmission?: { id: string; body: string; finalScore?: number | null; finalFeedback?: string | null } | null;
    needsReview: boolean;
  }>;
};

export type QuestionSearch = {
  q?: string;
  boardId?: string;
  careerId?: string;
  subjectId?: string;
  topicId?: string;
  year?: string;
  yearFrom?: string;
  yearTo?: string;
  institutionId?: string;
  positionId?: string;
  code?: string;
  kind?: QuestionKind | "";
  answered?: "correct" | "incorrect" | "unanswered" | "";
  favorite?: boolean;
  hasExplanation?: boolean;
};

export async function fetchQuestionFilters() {
  return apiRequest<QuestionFilters>("/questions/filters");
}

export async function fetchQuestions(filters: QuestionSearch) {
  const params = toParams(filters);
  return apiRequest<QuestionSummary[]>(`/questions${params.size ? `?${params}` : ""}`);
}

export async function fetchQuestionDetail(id: string) {
  return apiRequest<QuestionDetail>(`/questions/${id}`);
}

export async function submitQuestionAttempt(id: string, body: { selectedAnswer?: string; discursiveAnswer?: string; timeSeconds: number }) {
  return apiRequest<QuestionAttempt>(`/questions/${id}/attempts`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function setQuestionFavorite(id: string, favorite: boolean) {
  return apiRequest<{ ok?: boolean } | { id: string }>(`/questions/${id}/favorite`, { method: favorite ? "POST" : "DELETE" });
}

export async function fetchPerformance() {
  return apiRequest<PerformanceSubject[]>("/questions/performance");
}

export async function fetchHistory() {
  return apiRequest<AttemptHistory[]>("/questions/history");
}

export async function fetchReviewErrors() {
  return apiRequest<AttemptHistory[]>("/questions/review/errors");
}

export async function fetchSimulations() {
  return apiRequest<SimulationListItem[]>("/questions/simulations");
}

export async function createSimulation(title: string, questionCount: number, filters: QuestionSearch) {
  return apiRequest<SimulationDetail>("/questions/simulations", {
    method: "POST",
    body: JSON.stringify({ title, questionCount, filters: normalizeFilters(filters) })
  });
}

export async function fetchSimulation(id: string) {
  return apiRequest<SimulationDetail>(`/questions/simulations/${id}`);
}

export async function answerSimulationQuestion(
  simulationId: string,
  questionId: string,
  body: { selectedAnswer?: string; discursiveAnswer?: string; timeSeconds: number }
) {
  return apiRequest<QuestionAttempt>(`/questions/simulations/${simulationId}/attempts`, {
    method: "POST",
    body: JSON.stringify({ questionId, ...body })
  });
}

export async function submitSimulation(id: string) {
  return apiRequest<SimulationResults>(`/questions/simulations/${id}/submit`, { method: "POST" });
}

export function parseAlternatives(value: unknown): QuestionAlternative[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { id: unknown; text: unknown } => Boolean(item && typeof item === "object" && "id" in item && "text" in item))
    .map((item) => ({ id: String(item.id), text: String(item.text) }));
}

export function kindLabel(kind: QuestionKind) {
  if (kind === "DISCURSIVE") return "Discursiva";
  if (kind === "TRUE_FALSE") return "Certo/Errado";
  return "Multipla escolha";
}

function toParams(filters: QuestionSearch) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(normalizeFilters(filters))) {
    params.set(key, String(value));
  }
  return params;
}

function normalizeFilters(filters: QuestionSearch) {
  const normalized: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "" || value === false) continue;
    normalized[key] = value;
  }
  return normalized;
}
