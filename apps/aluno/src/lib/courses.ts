import { apiRequest } from "./api";

export type CourseStatus = "PRE_EDITAL" | "POS_EDITAL";

export type CourseStats = {
  moduleCount: number;
  lessonCount: number;
  workloadSeconds: number;
  completedLessons: number;
  watchedSeconds: number;
  progressPercent: number;
};

export type LessonSummary = {
  id: string;
  title: string;
  slug: string;
  description: string;
  position: number;
  durationSeconds: number;
  publishedAt?: string | null;
};

export type CourseModule = {
  id: string;
  title: string;
  position: number;
  lessons: LessonSummary[];
};

export type CourseSummary = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: CourseStatus;
  area: string;
  coverImageUrl?: string | null;
  workloadMinutes: number;
  publishedAt?: string | null;
  career: { id: string; name: string };
  board?: { id: string; name: string } | null;
  modules: CourseModule[];
  stats: CourseStats;
};

export type CourseDetail = CourseSummary & {
  allowed: boolean;
  enrolled: boolean;
};

export type CourseEnrollment = {
  id: string;
  courseId: string;
  createdAt: string;
  completedAt?: string | null;
  course: CourseSummary;
};

export type LessonDetail = {
  allowed: boolean;
  lesson: null | {
    id: string;
    title: string;
    description: string;
    durationSeconds: number;
    streamVideoUid?: string | null;
    module: {
      id: string;
      title: string;
      course: { id: string; title: string; slug: string };
    };
    subject: { id: string; name: string };
    topic?: { id: string; name: string } | null;
    teacher?: { id: string; nickname: string; fullName: string } | null;
    assets: Array<{
      id: string;
      type: string;
      metadata?: unknown;
      storage: { provider: string; bucket?: string; key?: string };
      canDownload: boolean;
    }>;
    doubts: Array<{ id: string; message: string; answer?: string | null; createdAt: string }>;
    progress?: { watchedSeconds: number; completedAt?: string | null } | null;
    rating?: { score: number; comment?: string | null } | null;
  };
};

export type CatalogFilters = {
  q?: string;
  status?: CourseStatus | "";
  careerId?: string;
  boardId?: string;
};

export type StudentCourseTotals = {
  completedLessons: number;
  totalLessons: number;
  watchedSeconds: number;
  enrolledCourses: number;
  progressPercent: number;
};

export type LessonPlayback = {
  allowed: boolean;
  playback?: {
    iframeUrl?: string;
    provider?: string;
    uid?: string;
  };
};

export type MaterialDownload = {
  allowed: boolean;
  url?: string;
  reason?: string;
};

export function fetchCourseCatalog(filters: CatalogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.careerId) params.set("careerId", filters.careerId);
  if (filters.boardId) params.set("boardId", filters.boardId);
  return apiRequest<CourseSummary[]>(`/courses${params.size ? `?${params}` : ""}`);
}

export function fetchMyCourses() {
  return apiRequest<CourseEnrollment[]>("/me/courses");
}

export function fetchCourseDetail(slug: string) {
  return apiRequest<CourseDetail>(`/courses/${slug}`);
}

export function enrollInCourse(slug: string) {
  return apiRequest<{ ok: boolean; enrollment: CourseEnrollment }>(`/courses/${slug}/enroll`, {
    method: "POST",
    body: "{}"
  });
}

export function fetchLessonDetail(id: string) {
  return apiRequest<LessonDetail>(`/lessons/${id}`);
}

export function fetchLessonPlayback(id: string) {
  return apiRequest<LessonPlayback>(`/lessons/${id}/playback`);
}

export function updateLessonProgress(id: string, watchedSeconds: number, completed: boolean) {
  return apiRequest(`/lessons/${id}/progress`, {
    method: "PATCH",
    body: JSON.stringify({ watchedSeconds, completed })
  });
}

export function rateLesson(id: string, score: number, comment?: string) {
  return apiRequest(`/lessons/${id}/ratings`, {
    method: "POST",
    body: JSON.stringify({ score, comment: comment || undefined })
  });
}

export function createLessonDoubt(id: string, message: string) {
  return apiRequest(`/lessons/${id}/doubts`, {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

export function fetchMaterialDownload(lessonId: string, assetId: string) {
  return apiRequest<MaterialDownload>(`/lessons/${lessonId}/materials/${assetId}/download`);
}

export function summarizeStudentCourses(enrollments: CourseEnrollment[]): StudentCourseTotals {
  const totalLessons = enrollments.reduce((sum, enrollment) => sum + enrollment.course.stats.lessonCount, 0);
  const completedLessons = enrollments.reduce((sum, enrollment) => sum + enrollment.course.stats.completedLessons, 0);
  const watchedSeconds = enrollments.reduce((sum, enrollment) => sum + enrollment.course.stats.watchedSeconds, 0);
  return {
    completedLessons,
    totalLessons,
    watchedSeconds,
    enrolledCourses: enrollments.length,
    progressPercent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
  };
}

export function findNextLesson(course: CourseSummary) {
  return course.modules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title }))).at(0) ?? null;
}

export function countCourseLessons(course: CourseSummary) {
  return course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
}

export function formatMinutes(totalSeconds: number) {
  if (totalSeconds <= 0) return "0 min";
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export function courseStatusLabel(status: CourseStatus) {
  return status === "POS_EDITAL" ? "Pos-edital" : "Pre-edital";
}

export function progressLabel(progressPercent: number) {
  if (progressPercent >= 100) return "Concluido";
  if (progressPercent > 0) return "Em andamento";
  return "Nao iniciado";
}
