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

export function createModule(body: { courseId: string; title: string; position: number }) {
  return apiRequest<{ id: string }>("/professor/modules", { method: "POST", body: JSON.stringify(body) });
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
