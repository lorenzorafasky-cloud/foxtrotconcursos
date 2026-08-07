import { apiRequest } from "./api";

export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "STARRED";
export type FocusMode = "FREE" | "POMODORO";

export type StudyTask = {
  id: string;
  listId: string;
  title: string;
  dueDate?: string | null;
  priority: TaskPriority;
  recurrence?: string | null;
  completedAt?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  subtasks?: StudyTask[];
  listTitle?: string;
};

export type StudyList = {
  id: string;
  title: string;
  isMyDay: boolean;
  tasks: StudyTask[];
};

export type StudyGoal = {
  id: string;
  title: string;
  period: "daily" | "weekly" | "custom";
  targetNetSeconds: number;
  targetQuestions: number;
  targetFlashcards: number;
  startsAt: string;
  endsAt?: string | null;
  completedAt?: string | null;
  progress?: { netSeconds: number; questions: number; flashcards: number; percent: number };
};

export type PlannerDashboard = {
  lists: StudyList[];
  goals: StudyGoal[];
  calendar: Array<{ date: string; items: StudyTask[] }>;
  consistency: Consistency;
  progress: {
    recentLessons: Array<{ id: string; watchedSeconds: number; completedAt?: string | null; lesson: { title: string; subject: { name: string }; module: { course: { title: string } } } }>;
    favoriteQuestions: Array<{ id: string; question: { id: string; code: string; statement: string; subject: { name: string }; topic?: { name: string } | null } }>;
    dueFlashcards: number;
    favoriteFlashcards: number;
  };
};

export type Consistency = {
  days: Array<{ date: string; netSeconds: number; questions?: number; active: boolean }>;
  streakDays: number;
  activeDays: number;
  weeklyNetSeconds: number;
  weeklyQuestions?: number;
};

export type FocusPreferences = {
  userId: string;
  focusMode: FocusMode;
  pomodoroSeconds: number;
  breakSeconds: number;
  longBreakSeconds: number;
  autoStartBreaks: boolean;
  soundSettings?: Record<string, number>;
};

export type FocusSession = {
  id: string;
  mode: FocusMode;
  grossSeconds: number;
  netSeconds: number;
  startedAt: string;
  endedAt?: string | null;
  task?: StudyTask | null;
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  subjectId?: string | null;
  topicId?: string | null;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
  favorite: boolean;
};

export type FocusDashboard = {
  netSecondsToday: number;
  weeklyNetSeconds: number;
  totalXp: number;
  rank: string;
  streakDays: number;
  consistency: Consistency;
  sessions: FocusSession[];
  tasks: StudyTask[];
  dueFlashcards: Flashcard[];
  preferences: FocusPreferences;
};

export function fetchPlannerDashboard() {
  return apiRequest<PlannerDashboard>("/planner/dashboard");
}

export function createStudyList(body: { title: string; isMyDay?: boolean }) {
  return apiRequest<StudyList>("/planner/lists", { method: "POST", body: JSON.stringify(body) });
}

export function createStudyTask(listId: string, body: { title: string; dueDate?: string; priority?: TaskPriority; recurrence?: string; subjectId?: string; topicId?: string }) {
  return apiRequest<StudyTask>(`/planner/lists/${listId}/tasks`, { method: "POST", body: JSON.stringify(body) });
}

export function completeStudyTask(id: string, completed: boolean) {
  return apiRequest<StudyTask>(`/planner/tasks/${id}/complete`, { method: "PATCH", body: JSON.stringify({ completed }) });
}

export function createStudyGoal(body: { title: string; period: "daily" | "weekly" | "custom"; targetNetSeconds?: number; targetQuestions?: number; targetFlashcards?: number; startsAt?: string; endsAt?: string }) {
  return apiRequest<StudyGoal>("/planner/goals", { method: "POST", body: JSON.stringify(body) });
}

export function updateStudyGoal(id: string, body: { completed?: boolean }) {
  return apiRequest<StudyGoal>(`/planner/goals/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function fetchFocusDashboard() {
  return apiRequest<FocusDashboard>("/focus/dashboard");
}

export function saveFocusSession(body: { mode: FocusMode; grossSeconds: number; netSeconds: number; taskId?: string; startedAt?: string }) {
  return apiRequest<FocusSession>("/focus/sessions", { method: "POST", body: JSON.stringify(body) });
}

export function updateFocusPreferences(body: Partial<FocusPreferences>) {
  return apiRequest<FocusPreferences>("/focus/preferences", { method: "PATCH", body: JSON.stringify(body) });
}

export function fetchFlashcards(filter: "due" | "favorites" | "all" = "all") {
  return apiRequest<Flashcard[]>(`/focus/flashcards?filter=${filter}`);
}

export function createFlashcard(body: { front: string; back: string; favorite?: boolean }) {
  return apiRequest<Flashcard>("/focus/flashcards", { method: "POST", body: JSON.stringify(body) });
}

export function reviewFlashcard(id: string, quality: number) {
  return apiRequest<Flashcard>(`/focus/flashcards/${id}/review`, { method: "POST", body: JSON.stringify({ quality }) });
}

export function favoriteFlashcard(id: string, favorite: boolean) {
  return apiRequest<Flashcard>(`/focus/flashcards/${id}/favorite`, { method: "PATCH", body: JSON.stringify({ favorite }) });
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const minuteRest = minutes % 60;
    return minuteRest ? `${hours}h ${minuteRest}min` : `${hours}h`;
  }
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function dateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
