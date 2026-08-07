import { apiRequest } from "./api";

export type CatalogItem = { id: string; name: string };
export type SubjectItem = CatalogItem & { topics: CatalogItem[] };
export type CourseStatus = "PRE_EDITAL" | "POS_EDITAL";
export type QuestionKind = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "DISCURSIVE";
export type LessonAssetType = "VIDEO" | "TRANSCRIPT" | "SUMMARY" | "SLIDE" | "PDF" | "THUMBNAIL";

export type ProfessorCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: CourseStatus;
  area: string;
  publishedAt?: string | null;
  career: CatalogItem;
  board?: CatalogItem | null;
  modules: Array<{
    id: string;
    title: string;
    position: number;
    lessons: ProfessorLesson[];
  }>;
};

export type ProfessorLesson = {
  id: string;
  moduleId: string;
  subjectId: string;
  title: string;
  slug: string;
  description: string;
  position: number;
  streamVideoUid?: string | null;
  durationSeconds: number;
  publishedAt?: string | null;
  subject?: CatalogItem;
  topic?: CatalogItem | null;
  assets?: Array<{ id: string; type: LessonAssetType; url: string; metadata?: unknown }>;
};

export type ProfessorDashboard = {
  doubts: Array<{
    id: string;
    message: string;
    createdAt: string;
    lesson: { id: string; title: string; subject?: CatalogItem; module?: { course?: { title: string } } };
    user: { id: string; nickname: string; fullName: string };
  }>;
  essays: EssaySubmission[];
  lessons: ProfessorLesson[];
  courses: ProfessorCourse[];
  students: StudentProgress[];
  questions: ProfessorQuestion[];
  simulations: ProfessorSimulation[];
};

export type ProfessorCatalog = {
  boards: CatalogItem[];
  careers: CatalogItem[];
  subjects: SubjectItem[];
  institutions: CatalogItem[];
  positions: CatalogItem[];
  courses: ProfessorCourse[];
  courseStatuses: CourseStatus[];
  questionKinds: QuestionKind[];
  assetTypes: LessonAssetType[];
};

export type StudentProgress = {
  id: string;
  user: { id: string; fullName: string; nickname: string; email: string };
  course: { id: string; title: string };
  stats: { lessonCount: number; completedLessons: number; watchedSeconds: number; progressPercent: number };
};

export type ProfessorQuestion = {
  id: string;
  code: string;
  kind: QuestionKind;
  statement: string;
  year: number;
  subject: CatalogItem;
  topic?: CatalogItem | null;
  board: CatalogItem;
  career: CatalogItem;
  institution: CatalogItem;
  position: CatalogItem;
};

export type ProfessorSimulation = {
  id: string;
  title: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  questionCount: number;
  questions: Array<{ id: string }>;
  attempts: Array<{ id: string; isCorrect?: boolean | null }>;
};

export type EssaySubmission = {
  id: string;
  body: string;
  finalScore?: number | null;
  finalFeedback?: string | null;
  correctedAt?: string | null;
  createdAt: string;
  student: { id: string; nickname: string; fullName: string };
  question: { id: string; code: string; statement: string; subject: CatalogItem; topic?: CatalogItem | null };
};

export function fetchProfessorDashboard() {
  return apiRequest<ProfessorDashboard>("/professor/dashboard");
}

export function fetchProfessorCatalog() {
  return apiRequest<ProfessorCatalog>("/professor/catalog");
}

export function createCourse(body: {
  title: string;
  slug: string;
  description: string;
  status: CourseStatus;
  careerId: string;
  boardId?: string;
  area: string;
  coverImageUrl?: string;
  workloadMinutes?: number;
}) {
  return apiRequest<ProfessorCourse>("/professor/courses", { method: "POST", body: JSON.stringify(body) });
}

export function publishCourse(id: string) {
  return apiRequest<ProfessorCourse>(`/professor/courses/${id}/publish`, { method: "PATCH", body: "{}" });
}

export function updateCourse(
  id: string,
  body: Partial<{
    title: string;
    slug: string;
    description: string;
    status: CourseStatus;
    careerId: string;
    boardId?: string;
    area: string;
    coverImageUrl?: string;
    workloadMinutes?: number;
  }>
) {
  return apiRequest<ProfessorCourse>(`/professor/courses/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function createModule(body: { courseId: string; title: string; position: number }) {
  return apiRequest<{ id: string }>("/professor/modules", { method: "POST", body: JSON.stringify(body) });
}

export function updateModule(id: string, body: { title?: string; position?: number }) {
  return apiRequest<{ id: string }>(`/professor/modules/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function createLesson(body: {
  moduleId: string;
  subjectId: string;
  topicId?: string;
  title: string;
  slug: string;
  description: string;
  position: number;
  streamVideoUid?: string;
  durationSeconds?: number;
}) {
  return apiRequest<ProfessorLesson>("/professor/lessons", { method: "POST", body: JSON.stringify(body) });
}

export function publishLesson(id: string) {
  return apiRequest<ProfessorLesson>(`/professor/lessons/${id}/publish`, { method: "PATCH", body: "{}" });
}

export function updateLesson(
  id: string,
  body: Partial<{
    moduleId: string;
    subjectId: string;
    topicId?: string;
    title: string;
    slug: string;
    description: string;
    position: number;
    streamVideoUid?: string;
    durationSeconds?: number;
  }>
) {
  return apiRequest<ProfessorLesson>(`/professor/lessons/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function createMaterial(body: { lessonId: string; type: LessonAssetType; url: string; metadata?: unknown }) {
  return apiRequest<{ id: string }>("/professor/materials", { method: "POST", body: JSON.stringify(body) });
}

export function createQuestion(body: {
  code: string;
  kind: QuestionKind;
  statement: string;
  alternatives?: Array<{ id: string; text: string }>;
  correctAnswer?: string;
  year: number;
  boardId: string;
  careerId: string;
  subjectId: string;
  topicId?: string;
  institutionId: string;
  positionId: string;
  sourceExam?: string;
  explanation?: string;
}) {
  return apiRequest<ProfessorQuestion>("/professor/questions", { method: "POST", body: JSON.stringify(body) });
}

export function createProfessorSimulation(body: {
  title: string;
  questionCount: number;
  filters?: { boardId?: string; careerId?: string; subjectId?: string; topicId?: string; year?: string; kind?: QuestionKind };
}) {
  return apiRequest<ProfessorSimulation>("/professor/simulations", { method: "POST", body: JSON.stringify(body) });
}

export function gradeEssay(id: string, body: { finalScore: number; finalFeedback: string }) {
  return apiRequest<EssaySubmission>(`/professor/essays/${id}/grade`, { method: "PATCH", body: JSON.stringify(body) });
}

export function answerLessonDoubt(id: string, answer: string) {
  return apiRequest(`/lesson-doubts/${id}/answer`, { method: "POST", body: JSON.stringify({ answer }) });
}

export function slugFrom(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function hasTeacherPermission(user: { roles: string[]; permissions: string[] } | null, permission: string) {
  return Boolean(user?.roles.includes("ADMIN_MASTER") || user?.permissions.includes(permission));
}

export function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.round(safeSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export function summarizeProfessorDashboard(dashboard: Pick<ProfessorDashboard, "courses" | "lessons" | "doubts" | "essays" | "students" | "questions" | "simulations">) {
  const publishedLessons = dashboard.lessons.filter((lesson) => lesson.publishedAt).length;
  const publishedCourses = dashboard.courses.filter((course) => course.publishedAt).length;
  const completedEssayCorrections = dashboard.essays.filter((essay) => essay.correctedAt).length;
  const averageProgress = dashboard.students.length
    ? Math.round(dashboard.students.reduce((sum, student) => sum + student.stats.progressPercent, 0) / dashboard.students.length)
    : 0;

  return {
    courses: dashboard.courses.length,
    publishedCourses,
    lessons: dashboard.lessons.length,
    publishedLessons,
    pendingDoubts: dashboard.doubts.length,
    pendingEssays: dashboard.essays.filter((essay) => !essay.correctedAt).length,
    completedEssayCorrections,
    students: dashboard.students.length,
    questions: dashboard.questions.length,
    simulations: dashboard.simulations.length,
    averageProgress
  };
}

export function parseAlternatives(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^([A-Za-z0-9]+)[).:-]\s*(.+)$/);
      return { id: (match?.[1] ?? String.fromCharCode(65 + index)).toUpperCase(), text: match?.[2] ?? line };
    });
}

export function validateCoursePayload(body: { title: string; slug: string; description: string; careerId: string; area: string }) {
  const errors: Record<string, string> = {};
  if (!body.title.trim()) errors.title = "Informe o titulo.";
  if (!slugFrom(body.slug)) errors.slug = "Informe um slug valido.";
  if (!body.description.trim()) errors.description = "Informe a descricao.";
  if (!body.careerId) errors.careerId = "Escolha a carreira.";
  if (!body.area.trim()) errors.area = "Informe a area.";
  return errors;
}

export function validateQuestionPayload(body: {
  code: string;
  kind: QuestionKind;
  statement: string;
  alternativesText: string;
  correctAnswer: string;
  year: string;
  boardId: string;
  careerId: string;
  subjectId: string;
  institutionId: string;
  positionId: string;
}) {
  const errors: Record<string, string> = {};
  if (!body.code.trim()) errors.code = "Informe o codigo.";
  if (!body.statement.trim()) errors.statement = "Informe o enunciado.";
  if (!Number.isInteger(Number(body.year)) || Number(body.year) < 1900) errors.year = "Informe um ano valido.";
  if (!body.boardId) errors.boardId = "Escolha a banca.";
  if (!body.careerId) errors.careerId = "Escolha a carreira.";
  if (!body.subjectId) errors.subjectId = "Escolha a materia.";
  if (!body.institutionId) errors.institutionId = "Escolha a instituicao.";
  if (!body.positionId) errors.positionId = "Escolha o cargo.";
  if (body.kind !== "DISCURSIVE" && parseAlternatives(body.alternativesText).length < 2) errors.alternativesText = "Informe ao menos duas alternativas.";
  if (body.kind !== "DISCURSIVE" && !body.correctAnswer.trim()) errors.correctAnswer = "Informe o gabarito.";
  return errors;
}

export function simulationAccuracy(simulation: Pick<ProfessorSimulation, "attempts">) {
  const graded = simulation.attempts.filter((attempt) => attempt.isCorrect !== null && attempt.isCorrect !== undefined);
  if (graded.length === 0) return 0;
  return Math.round((graded.filter((attempt) => attempt.isCorrect).length / graded.length) * 100);
}
