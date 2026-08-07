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
