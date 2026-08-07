import { apiBaseUrl, apiRequest } from "./api";

export type XpRule = {
  key: string;
  source: string;
  points: number;
  dailyCap: number;
  description: string;
};

export type LevelInfo = {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
};

export type XpEvent = {
  id: string;
  source: string;
  points: number;
  ruleKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type Achievement = {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  requirement: { metric: string; target: number };
  progress: number;
  progressPercent: number;
  unlocked: boolean;
  awardedAt?: string | null;
};

export type Challenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  metric: string;
  targetValue: number;
  rewardXp: number;
  startsAt: string;
  endsAt: string;
  computedProgress: number;
  progressPercent: number;
  participation?: { id: string; progress: number; completedAt?: string | null; rewardClaimedAt?: string | null } | null;
};

export type NotificationItem = {
  id: string;
  type: "SYSTEM" | "ACHIEVEMENT" | "CHALLENGE" | "RANKING";
  title: string;
  body: string;
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type Leaderboard = {
  period: "daily" | "weekly" | "all";
  generatedAt: string;
  entries: Array<{ position: number; userId: string; nickname: string; avatarUrl?: string | null; xp: number; level: number }>;
};

export type GamificationDashboard = {
  totalXp: number;
  level: LevelInfo;
  rankingPosition?: number | null;
  recentXp: XpEvent[];
  achievements: Achievement[];
  challenges: Challenge[];
  notifications: NotificationItem[];
  leaderboard: Leaderboard;
  rules: XpRule[];
};

export function fetchGamificationDashboard() {
  return apiRequest<GamificationDashboard>("/gamification/dashboard");
}

export function fetchLeaderboard(period: "daily" | "weekly" | "all" = "weekly") {
  return apiRequest<Leaderboard>(`/gamification/leaderboard?period=${period}`);
}

export function joinChallenge(id: string) {
  return apiRequest(`/gamification/challenges/${id}/join`, { method: "POST" });
}

export function markNotificationRead(id: string) {
  return apiRequest<NotificationItem>(`/gamification/notifications/${id}/read`, { method: "PATCH" });
}

export function createGamificationStream(onEvent: (event: MessageEvent) => void) {
  const stream = new EventSource(`${apiBaseUrl}/gamification/stream`, { withCredentials: true });
  stream.addEventListener("dashboard", onEvent);
  stream.addEventListener("leaderboard", onEvent);
  stream.addEventListener("notification", onEvent);
  stream.addEventListener("xp", onEvent);
  return stream;
}

export function normalizeProgressPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value || 0)));
}

export function countUnreadNotifications(notifications: NotificationItem[]) {
  return notifications.filter((notification) => !notification.readAt).length;
}

export function formatXpSource(source: string) {
  const labels: Record<string, string> = {
    FOCUS_SESSION: "Sessao de foco",
    LESSON_COMPLETED: "Aula concluida",
    QUESTION_CORRECT: "Questao correta",
    FLASHCARD_REVIEWED: "Flashcard revisado",
    CHALLENGE_COMPLETED: "Desafio concluido",
    ACHIEVEMENT_UNLOCKED: "Conquista liberada"
  };
  return labels[source] ?? source.replace(/_/g, " ").toLowerCase();
}

export function achievementStatusLabel(achievement: Pick<Achievement, "unlocked" | "progress" | "requirement">) {
  if (achievement.unlocked) return "Conquistada";
  return `${achievement.progress}/${achievement.requirement.target}`;
}

export function challengeTimeLeftLabel(challenge: Pick<Challenge, "endsAt">, now = new Date()) {
  const diff = new Date(challenge.endsAt).getTime() - now.getTime();
  if (diff <= 0) return "Encerrado";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days === 1 ? "1 dia restante" : `${days} dias restantes`;
}
