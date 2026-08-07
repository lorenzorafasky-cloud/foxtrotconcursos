import { describe, expect, it } from "vitest";
import {
  achievementStatusLabel,
  challengeTimeLeftLabel,
  countUnreadNotifications,
  formatXpSource,
  normalizeProgressPercent,
  type Achievement,
  type Challenge,
  type NotificationItem
} from "./gamification";

const notifications: NotificationItem[] = [
  { id: "1", type: "SYSTEM", title: "Nova meta", body: "Meta criada", createdAt: "2026-08-07T00:00:00.000Z" },
  {
    id: "2",
    type: "RANKING",
    title: "Ranking",
    body: "Voce subiu",
    readAt: "2026-08-07T01:00:00.000Z",
    createdAt: "2026-08-07T00:00:00.000Z"
  }
];

const achievement: Achievement = {
  id: "achievement-1",
  key: "first-focus",
  title: "Primeiro foco",
  description: "Registre uma sessao",
  icon: "timer",
  xpReward: 50,
  requirement: { metric: "focus_sessions", target: 3 },
  progress: 2,
  progressPercent: 67,
  unlocked: false
};

const challenge: Challenge = {
  id: "challenge-1",
  slug: "semana",
  title: "Semana forte",
  description: "Estude todos os dias",
  metric: "net_seconds",
  targetValue: 3600,
  rewardXp: 120,
  startsAt: "2026-08-07T00:00:00.000Z",
  endsAt: "2026-08-10T00:00:00.000Z",
  computedProgress: 600,
  progressPercent: 17
};

describe("student gamification helpers", () => {
  it("normalizes progress percentages", () => {
    expect(normalizeProgressPercent(-10)).toBe(0);
    expect(normalizeProgressPercent(42.4)).toBe(42);
    expect(normalizeProgressPercent(130)).toBe(100);
  });

  it("counts unread notifications", () => {
    expect(countUnreadNotifications(notifications)).toBe(1);
  });

  it("formats XP source labels", () => {
    expect(formatXpSource("FOCUS_SESSION")).toBe("Sessao de foco");
    expect(formatXpSource("CUSTOM_BONUS")).toBe("custom bonus");
  });

  it("labels achievements and challenge deadlines", () => {
    expect(achievementStatusLabel(achievement)).toBe("2/3");
    expect(achievementStatusLabel({ ...achievement, unlocked: true })).toBe("Conquistada");
    expect(challengeTimeLeftLabel(challenge, new Date("2026-08-07T12:00:00.000Z"))).toBe("3 dias restantes");
    expect(challengeTimeLeftLabel(challenge, new Date("2026-08-11T00:00:00.000Z"))).toBe("Encerrado");
  });
});
