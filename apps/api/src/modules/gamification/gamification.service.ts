import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ChallengeStatus, NotificationType, Prisma } from "@foxtrot/database";
import { Observable, Subject } from "rxjs";
import { PrismaService } from "../../core/prisma.service";
import { GamificationGateway } from "./gamification.gateway";
import { DEFAULT_ACHIEVEMENTS, XP_RULES, levelForXp, ruleForSource } from "./gamification.rules";
import { LeaderboardPeriod, LeaderboardScope, LeaderboardService } from "./leaderboard.service";

type StreamEvent = { type: string; data: string | object };
type Requirement = { metric: string; target: number };

const LEADERBOARD_BROADCAST_INTERVAL_MS = 5_000;

@Injectable()
export class GamificationService {
  private readonly streams = new Map<string, Subject<StreamEvent>>();
  private readonly lastLeaderboardBroadcast = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboards: LeaderboardService,
    @Optional() private readonly gateway?: GamificationGateway
  ) {}

  rules() {
    return XP_RULES;
  }

  async dashboard(userId: string) {
    await this.ensureDefaultAchievements();
    const targetExam = await this.targetExam(userId);
    const [totalXp, recentXp, achievements, challenges, notifications, leaderboard, contestLeaderboard] = await Promise.all([
      this.totalXp(userId),
      this.prisma.xpEvent.findMany({ where: { userId, revokedAt: null }, orderBy: { createdAt: "desc" }, take: 15 }),
      this.achievements(userId),
      this.challenges(userId),
      this.notifications(userId, false),
      this.leaderboard("weekly"),
      targetExam ? this.leaderboard("weekly", { kind: "exam", examId: targetExam.id }) : Promise.resolve(null)
    ]);
    const level = levelForXp(totalXp);
    const rankingPosition = leaderboard.entries.find((entry) => entry.userId === userId)?.position ?? null;
    const contestRankingPosition = contestLeaderboard?.entries.find((entry) => entry.userId === userId)?.position ?? null;
    return {
      totalXp,
      level,
      rankingPosition,
      contestRankingPosition,
      targetExam,
      recentXp,
      achievements,
      challenges,
      notifications,
      leaderboard,
      contestLeaderboard,
      rules: XP_RULES
    };
  }

  async awardXp(userId: string, source: string, points: number, metadata?: Prisma.InputJsonValue, idempotencyKey?: string) {
    const rule = ruleForSource(source);
    if (!rule) throw new BadRequestException("Fonte de XP nao autorizada.");
    if (!Number.isFinite(points) || points <= 0) throw new BadRequestException("Pontuacao invalida.");

    if (idempotencyKey) {
      const existing = await this.prisma.xpEvent.findUnique({ where: { idempotencyKey } });
      if (existing) return { awarded: false, duplicate: true, event: existing, points: 0 };
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const daily = await this.prisma.xpEvent.aggregate({
      where: { userId, source, revokedAt: null, createdAt: { gte: dayStart } },
      _sum: { points: true }
    });
    const available = Math.max(0, rule.dailyCap - (daily._sum.points ?? 0));
    const awardedPoints = Math.min(Math.round(points), available);
    if (awardedPoints <= 0) {
      return { awarded: false, capped: true, points: 0 };
    }

    const event = await this.prisma.xpEvent.create({
      data: {
        userId,
        source,
        ruleKey: rule.key,
        points: awardedPoints,
        idempotencyKey,
        metadata
      }
    });
    this.emit(userId, "xp", event);

    const targetExam = await this.targetExam(userId);
    await this.leaderboards.recordXp(userId, awardedPoints, targetExam?.id ?? null);
    void this.broadcastLeaderboards(targetExam?.id ?? null);

    if (!["achievement:reward", "challenge:reward"].includes(source)) {
      await Promise.all([this.evaluateAchievements(userId), this.evaluateChallenges(userId)]);
    }
    return { awarded: true, event, points: awardedPoints };
  }

  leaderboard(period: LeaderboardPeriod = "weekly", scope: LeaderboardScope = { kind: "global" }) {
    return this.leaderboards.leaderboard(period, scope);
  }

  async leaderboardForUser(userId: string, period: LeaderboardPeriod = "weekly", scope: "global" | "contest" = "global") {
    if (scope === "global") return this.leaderboard(period);
    const targetExam = await this.targetExam(userId);
    if (!targetExam) {
      throw new BadRequestException("Defina um concurso de interesse no onboarding para ver a disputa por concurso-alvo.");
    }
    return this.leaderboard(period, { kind: "exam", examId: targetExam.id });
  }

  async achievements(userId: string) {
    await this.ensureDefaultAchievements();
    const [definitions, unlocked] = await Promise.all([
      this.prisma.achievementDefinition.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
      this.prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } })
    ]);
    const unlockedByAchievement = new Map(unlocked.map((item) => [item.achievementId, item]));
    const metrics = await this.metrics(userId);
    return definitions.map((achievement) => {
      const requirement = achievement.requirement as Requirement;
      const progress = Math.min(metrics[requirement.metric] ?? 0, requirement.target);
      const userAchievement = unlockedByAchievement.get(achievement.id);
      return {
        ...achievement,
        requirement,
        progress,
        progressPercent: requirement.target > 0 ? Math.round((progress / requirement.target) * 100) : 100,
        unlocked: Boolean(userAchievement),
        awardedAt: userAchievement?.awardedAt ?? null
      };
    });
  }

  async joinChallenge(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenge.findFirst({
      where: { id: challengeId, status: ChallengeStatus.ACTIVE, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } }
    });
    if (!challenge) throw new NotFoundException("Desafio indisponivel.");
    const participant = await this.prisma.challengeParticipant.upsert({
      where: { challengeId_userId: { challengeId, userId } },
      update: {},
      create: { challengeId, userId }
    });
    await this.createNotification(userId, {
      type: NotificationType.CHALLENGE,
      title: "Desafio iniciado",
      body: `Voce entrou em ${challenge.title}.`,
      actionUrl: "/gamificacao",
      metadata: { challengeId }
    });
    await this.evaluateChallenges(userId);
    return participant;
  }

  async challenges(userId: string) {
    const challenges = await this.prisma.challenge.findMany({
      where: { status: ChallengeStatus.ACTIVE, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
      include: { participants: { where: { userId } } },
      orderBy: { endsAt: "asc" }
    });
    const metrics = await this.metrics(userId);
    return challenges.map((challenge) => {
      const participation = challenge.participants[0] ?? null;
      const computedProgress = Math.min(metrics[challenge.metric] ?? 0, challenge.targetValue);
      return {
        ...challenge,
        participants: undefined,
        participation,
        computedProgress,
        progressPercent: challenge.targetValue > 0 ? Math.round((computedProgress / challenge.targetValue) * 100) : 100
      };
    });
  }

  notifications(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, readAt: unreadOnly ? null : undefined },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }

  async markNotificationRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException("Notificacao nao encontrada.");
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  stream(userId: string) {
    return new Observable<StreamEvent>((subscriber) => {
      const subject = this.subject(userId);
      const subscription = subject.subscribe((event) => subscriber.next(event));
      void this.dashboard(userId).then((dashboard) => subscriber.next({ type: "dashboard", data: dashboard })).catch((error: unknown) => {
        subscriber.next({ type: "error", data: { message: error instanceof Error ? error.message : "Erro de stream." } });
      });
      const interval = setInterval(() => {
        void this.leaderboard("weekly").then((leaderboard) => subscriber.next({ type: "leaderboard", data: leaderboard }));
      }, 10_000);
      return () => {
        clearInterval(interval);
        subscription.unsubscribe();
      };
    });
  }

  private async ensureDefaultAchievements() {
    await Promise.all(
      DEFAULT_ACHIEVEMENTS.map((achievement) =>
        this.prisma.achievementDefinition.upsert({
          where: { key: achievement.key },
          update: {
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            requirement: achievement.requirement,
            xpReward: achievement.xpReward,
            active: true
          },
          create: achievement
        })
      )
    );
  }

  private async evaluateAchievements(userId: string) {
    await this.ensureDefaultAchievements();
    const [definitions, unlocked, metrics] = await Promise.all([
      this.prisma.achievementDefinition.findMany({ where: { active: true } }),
      this.prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
      this.metrics(userId)
    ]);
    const unlockedIds = new Set(unlocked.map((item) => item.achievementId));
    for (const achievement of definitions) {
      if (unlockedIds.has(achievement.id)) continue;
      const requirement = achievement.requirement as Requirement;
      if ((metrics[requirement.metric] ?? 0) < requirement.target) continue;
      await this.prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id, metadata: { metric: requirement.metric, target: requirement.target } }
      });
      if (achievement.xpReward > 0) {
        await this.awardXp(userId, "achievement:reward", achievement.xpReward, { achievementKey: achievement.key }, `achievement:${achievement.key}:${userId}`);
      }
      await this.createNotification(userId, {
        type: NotificationType.ACHIEVEMENT,
        title: "Conquista desbloqueada",
        body: achievement.title,
        actionUrl: "/gamificacao",
        metadata: { achievementKey: achievement.key }
      });
    }
  }

  private async evaluateChallenges(userId: string) {
    const active = await this.prisma.challengeParticipant.findMany({
      where: {
        userId,
        challenge: { status: ChallengeStatus.ACTIVE, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } }
      },
      include: { challenge: true }
    });
    if (!active.length) return;
    const metrics = await this.metrics(userId);
    for (const participant of active) {
      const progress = Math.min(metrics[participant.challenge.metric] ?? 0, participant.challenge.targetValue);
      const completedAt = progress >= participant.challenge.targetValue ? participant.completedAt ?? new Date() : participant.completedAt;
      await this.prisma.challengeParticipant.update({
        where: { id: participant.id },
        data: { progress, completedAt }
      });
      if (completedAt && !participant.rewardClaimedAt) {
        if (participant.challenge.rewardXp > 0) {
          await this.awardXp(
            userId,
            "challenge:reward",
            participant.challenge.rewardXp,
            { challengeId: participant.challengeId },
            `challenge:${participant.challengeId}:${userId}`
          );
        }
        await this.prisma.challengeParticipant.update({ where: { id: participant.id }, data: { rewardClaimedAt: new Date() } });
        await this.createNotification(userId, {
          type: NotificationType.CHALLENGE,
          title: "Desafio concluido",
          body: participant.challenge.title,
          actionUrl: "/gamificacao",
          metadata: { challengeId: participant.challengeId }
        });
      }
    }
  }

  private async createNotification(userId: string, data: { type: NotificationType; title: string; body: string; actionUrl?: string; metadata?: Prisma.InputJsonValue }) {
    const notification = await this.prisma.notification.create({ data: { userId, ...data } });
    this.emit(userId, "notification", notification);
    return notification;
  }

  private async totalXp(userId: string) {
    const result = await this.prisma.xpEvent.aggregate({ where: { userId, revokedAt: null }, _sum: { points: true } });
    return result._sum.points ?? 0;
  }

  private async metrics(userId: string) {
    const [totalXp, focusSessions, correctQuestions, focus, questions] = await Promise.all([
      this.totalXp(userId),
      this.prisma.focusSession.count({ where: { userId } }),
      this.prisma.questionAttempt.count({ where: { userId, isCorrect: true } }),
      this.prisma.focusSession.findMany({ where: { userId, startedAt: { gte: daysAgo(29) } }, select: { startedAt: true, netSeconds: true } }),
      this.prisma.questionAttempt.findMany({ where: { userId, createdAt: { gte: daysAgo(29) } }, select: { createdAt: true } })
    ]);
    const activeDays = Array.from({ length: 30 }, (_, index) => {
      const date = daysAgo(29 - index);
      const key = dateKey(date);
      return {
        date: key,
        active:
          focus.some((session) => dateKey(session.startedAt) === key && session.netSeconds > 0) ||
          questions.some((attempt) => dateKey(attempt.createdAt) === key)
      };
    });
    return {
      totalXp,
      focusSessions,
      correctQuestions,
      streakDays: currentStreak(activeDays),
      weeklyNetMinutes: Math.floor(
        focus.filter((session) => session.startedAt >= daysAgo(6)).reduce((sum, session) => sum + session.netSeconds, 0) / 60
      ),
      weeklyQuestions: questions.filter((attempt) => attempt.createdAt >= daysAgo(6)).length
    } as Record<string, number>;
  }

  private async targetExam(userId: string) {
    const profile = await this.prisma.onboardingProfile.findUnique({
      where: { userId },
      select: { targetExam: { select: { id: true, name: true } } }
    });
    return profile?.targetExam ?? null;
  }

  /** Broadcast throttled dos leaderboards afetados via Socket.io. */
  private async broadcastLeaderboards(examId: string | null) {
    if (!this.gateway) return;
    const scopes: LeaderboardScope[] = [{ kind: "global" }];
    if (examId) scopes.push({ kind: "exam", examId });
    const now = Date.now();
    for (const scope of scopes) {
      const key = this.leaderboards.scopeKey(scope);
      const last = this.lastLeaderboardBroadcast.get(key) ?? 0;
      if (now - last < LEADERBOARD_BROADCAST_INTERVAL_MS) continue;
      this.lastLeaderboardBroadcast.set(key, now);
      try {
        const leaderboard = await this.leaderboards.leaderboard("weekly", scope);
        this.gateway.emitLeaderboard(key, leaderboard);
      } catch {
        // best-effort: tempo real nunca deve derrubar o fluxo de XP
      }
    }
  }

  private subject(userId: string) {
    const existing = this.streams.get(userId);
    if (existing) return existing;
    const next = new Subject<StreamEvent>();
    this.streams.set(userId, next);
    return next;
  }

  private emit(userId: string, type: string, data: string | object) {
    this.subject(userId).next({ type, data });
    this.gateway?.emitToUser(userId, type, data);
  }
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function currentStreak(days: Array<{ active: boolean }>) {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (!days[index]?.active) break;
    streak += 1;
  }
  return streak;
}
