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
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
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

export function priorityLabel(priority: TaskPriority) {
  const labels: Record<TaskPriority, string> = {
    LOW: "Baixa",
    NORMAL: "Normal",
    HIGH: "Alta",
    STARRED: "Favorita"
  };
  return labels[priority];
}

export function summarizeTasks(lists: StudyList[], today = new Date()) {
  const tasks = lists.flatMap((list) => list.tasks);
  const todayValue = dateInputValue(today);
  const completed = tasks.filter((task) => Boolean(task.completedAt)).length;
  const openTasks = tasks.filter((task) => !task.completedAt);
  const overdue = openTasks.filter((task) => Boolean(task.dueDate) && String(task.dueDate).slice(0, 10) < todayValue).length;
  const dueToday = openTasks.filter((task) => String(task.dueDate ?? "").slice(0, 10) === todayValue).length;
  const starred = tasks.filter((task) => task.priority === "STARRED").length;

  return {
    total: tasks.length,
    completed,
    open: openTasks.length,
    overdue,
    dueToday,
    starred,
    completionPercent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0
  };
}

export function summarizeGoals(goals: StudyGoal[]) {
  const completed = goals.filter((goal) => Boolean(goal.completedAt)).length;
  const averageProgress = goals.length
    ? Math.round(goals.reduce((sum, goal) => sum + Math.min(100, Math.max(0, goal.progress?.percent ?? 0)), 0) / goals.length)
    : 0;

  return {
    total: goals.length,
    completed,
    active: goals.length - completed,
    averageProgress
  };
}

export function consistencyPercent(consistency: Pick<Consistency, "days" | "activeDays">) {
  return consistency.days.length ? Math.round((consistency.activeDays / consistency.days.length) * 100) : 0;
}

export function calendarDayLabel(date: string, today = new Date()) {
  const value = date.slice(0, 10);
  const todayValue = dateInputValue(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowValue = dateInputValue(tomorrow);

  if (value === todayValue) return "Hoje";
  if (value === tomorrowValue) return "Amanha";
  return value.split("-").reverse().join("/");
}

export function clampTimerSeconds(seconds: number, min = 0, max = 12 * 60 * 60) {
  return Math.min(max, Math.max(min, Math.floor(seconds || 0)));
}

export function flashcardDueCount(cards: Flashcard[], now = new Date()) {
  return cards.filter((card) => new Date(card.dueAt).getTime() <= now.getTime()).length;
}
