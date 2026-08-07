import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ChallengeStatus, NotificationType } from "@foxtrot/database";
import { describe, expect, it, vi } from "vitest";
import { GamificationService } from "../src/modules/gamification/gamification.service";

describe("GamificationService", () => {
  it("rejects xp from unauthorized sources", async () => {
    const service = new GamificationService(makePrismaMock() as never);

    await expect(service.awardXp("student-1", "free:points", 999)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("applies daily caps and unlocks an achievement with notification", async () => {
    const prisma = makePrismaMock({
      xpAggregate: [{ _sum: { points: 295 } }, { _sum: { points: 300 } }],
      achievements: [{
        id: "achievement-1",
        key: "first-focus-session",
        title: "Primeira Area Foco",
        description: "Registrou a primeira sessao de foco.",
        icon: "timer",
        xpReward: 0,
        requirement: { metric: "focusSessions", target: 1 },
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }],
      focusSessionCount: 1
    });
    const service = new GamificationService(prisma as never);

    await expect(service.awardXp("student-1", "question:correct", 10, { questionId: "q1" }, "attempt-1")).resolves.toMatchObject({
      awarded: true,
      points: 5
    });
    expect(prisma.xpEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "student-1",
        source: "question:correct",
        ruleKey: "question.correct",
        points: 5,
        idempotencyKey: "attempt-1"
      })
    });
    expect(prisma.userAchievement.create).toHaveBeenCalledWith({
      data: { userId: "student-1", achievementId: "achievement-1", metadata: { metric: "focusSessions", target: 1 } }
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "student-1", type: NotificationType.ACHIEVEMENT })
    });
  });

  it("does not duplicate idempotent xp events", async () => {
    const prisma = makePrismaMock({
      existingXp: { id: "xp-1", userId: "student-1", source: "question:correct", points: 10 }
    });
    const service = new GamificationService(prisma as never);

    await expect(service.awardXp("student-1", "question:correct", 10, undefined, "attempt-1")).resolves.toMatchObject({
      awarded: false,
      duplicate: true,
      points: 0
    });
    expect(prisma.xpEvent.create).not.toHaveBeenCalled();
  });

  it("returns leaderboard ordered by xp with level data", async () => {
    const prisma = makePrismaMock({
      leaderboard: [
        { userId: "student-2", _sum: { points: 600 } },
        { userId: "student-1", _sum: { points: 120 } }
      ],
      users: [
        { id: "student-1", nickname: "recruta01", avatarUrl: null },
        { id: "student-2", nickname: "operador02", avatarUrl: null }
      ]
    });
    const service = new GamificationService(prisma as never);

    await expect(service.leaderboard("weekly")).resolves.toMatchObject({
      entries: [
        { position: 1, nickname: "operador02", xp: 600 },
        { position: 2, nickname: "recruta01", xp: 120 }
      ]
    });
  });

  it("blocks joining unavailable challenges", async () => {
    const prisma = makePrismaMock({ challenge: null });
    const service = new GamificationService(prisma as never);

    await expect(service.joinChallenge("student-1", "challenge-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("joins and completes an active challenge with reward notification", async () => {
    const challenge = {
      id: "challenge-1",
      slug: "semana",
      title: "Semana operacional",
      description: "Foco semanal",
      status: ChallengeStatus.ACTIVE,
      metric: "weeklyNetMinutes",
      targetValue: 10,
      rewardXp: 20,
      startsAt: new Date(Date.now() - 60_000),
      endsAt: new Date(Date.now() + 60_000)
    };
    const prisma = makePrismaMock({
      challenge,
      activeParticipants: [{ id: "participant-1", userId: "student-1", challengeId: "challenge-1", completedAt: null, rewardClaimedAt: null, challenge }],
      focusSessions: [{ startedAt: new Date(), netSeconds: 600 }],
      xpAggregate: [{ _sum: { points: 0 } }, { _sum: { points: 0 } }]
    });
    const service = new GamificationService(prisma as never);

    await expect(service.joinChallenge("student-1", "challenge-1")).resolves.toMatchObject({ id: "participant-1" });
    expect(prisma.challengeParticipant.update).toHaveBeenCalledWith({
      where: { id: "participant-1" },
      data: { progress: 10, completedAt: expect.any(Date) }
    });
    expect(prisma.xpEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: "challenge:reward", points: 20, idempotencyKey: "challenge:challenge-1:student-1" })
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "student-1", type: NotificationType.CHALLENGE, title: "Desafio concluido" })
    });
  });
});

function makePrismaMock({
  existingXp = null,
  xpAggregate = [{ _sum: { points: 0 } }],
  achievements = [],
  focusSessionCount = 0,
  correctQuestionCount = 0,
  focusSessions = [],
  questionAttempts = [],
  leaderboard = [],
  users = [],
  challenge = { id: "challenge-1" },
  activeParticipants = []
}: {
  existingXp?: Record<string, unknown> | null;
  xpAggregate?: Array<{ _sum: { points: number | null } }>;
  achievements?: Array<Record<string, unknown>>;
  focusSessionCount?: number;
  correctQuestionCount?: number;
  focusSessions?: Array<Record<string, unknown>>;
  questionAttempts?: Array<Record<string, unknown>>;
  leaderboard?: Array<Record<string, unknown>>;
  users?: Array<Record<string, unknown>>;
  challenge?: Record<string, unknown> | null;
  activeParticipants?: Array<Record<string, unknown>>;
} = {}) {
  const aggregate = vi.fn();
  for (const result of xpAggregate) aggregate.mockResolvedValueOnce(result);
  aggregate.mockResolvedValue({ _sum: { points: 0 } });
  return {
    xpEvent: {
      findUnique: vi.fn().mockResolvedValue(existingXp),
      aggregate,
      create: vi.fn(({ data }) => Promise.resolve({ id: "xp-1", createdAt: new Date(), ...data })),
      findMany: vi.fn().mockResolvedValue([]),
      groupBy: vi.fn().mockResolvedValue(leaderboard)
    },
    achievementDefinition: {
      upsert: vi.fn(({ create }) => Promise.resolve({ id: create.key, ...create })),
      findMany: vi.fn().mockResolvedValue(achievements)
    },
    userAchievement: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(({ data }) => Promise.resolve({ id: "user-achievement-1", ...data }))
    },
    notification: {
      create: vi.fn(({ data }) => Promise.resolve({ id: "notification-1", ...data })),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id: "notification-1", userId: "student-1" }),
      update: vi.fn(({ where, data }) => Promise.resolve({ id: where.id, ...data }))
    },
    focusSession: {
      count: vi.fn().mockResolvedValue(focusSessionCount),
      findMany: vi.fn().mockResolvedValue(focusSessions)
    },
    questionAttempt: {
      count: vi.fn().mockResolvedValue(correctQuestionCount),
      findMany: vi.fn().mockResolvedValue(questionAttempts)
    },
    challenge: {
      findFirst: vi.fn().mockResolvedValue(challenge),
      findMany: vi.fn().mockResolvedValue([])
    },
    challengeParticipant: {
      upsert: vi.fn().mockResolvedValue({ id: "participant-1", challengeId: "challenge-1", userId: "student-1" }),
      findMany: vi.fn().mockResolvedValue(activeParticipants),
      update: vi.fn(({ where, data }) => Promise.resolve({ id: where.id, ...data }))
    },
    user: {
      findMany: vi.fn().mockResolvedValue(users)
    }
  };
}
