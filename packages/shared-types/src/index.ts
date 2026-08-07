export const roles = [
  "ADMIN_MASTER",
  "PROFESSOR",
  "ALUNO_ILIMITADO",
  "ALUNO_CURSO_ESPECIFICO"
] as const;

export type Role = (typeof roles)[number];

export const permissions = [
  "admin:impersonate",
  "admin:manage-users",
  "admin:manage-content",
  "admin:manage-ai",
  "admin:manage-payments",
  "teacher:answer-questions",
  "teacher:publish-lessons",
  "teacher:grade-essays",
  "student:access-courses",
  "student:access-questions",
  "student:use-focus",
  "student:use-planner"
] as const;

export type Permission = (typeof permissions)[number];

export type PublicUser = {
  id: string;
  fullName: string;
  nickname: string;
  email: string;
  roles: Role[];
  twoFactorEnabled: boolean;
};

export type CourseCard = {
  id: string;
  title: string;
  slug: string;
  description: string;
  career: string;
  board: string;
  status: "PRE_EDITAL" | "POS_EDITAL";
  workloadMinutes: number;
};

export type QuestionFilters = {
  boardId?: string;
  careerId?: string;
  subjectId?: string;
  topicId?: string;
  year?: number;
  institutionId?: string;
  positionId?: string;
  code?: string;
};

export type RankName =
  | "Recruta"
  | "Soldado"
  | "Cabo"
  | "Sargento"
  | "Tenente"
  | "Capitao"
  | "Major"
  | "Coronel";

export type FocusSessionInput = {
  mode: "FREE" | "POMODORO";
  grossSeconds: number;
  netSeconds: number;
  taskId?: string;
};

export * from "./api-client";
