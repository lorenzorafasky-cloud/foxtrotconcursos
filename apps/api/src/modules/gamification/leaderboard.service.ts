import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { RedisService } from "../../core/redis.service";
import { levelForXp } from "./gamification.rules";

export type LeaderboardPeriod = "daily" | "weekly" | "all";
export type LeaderboardScope = { kind: "global" } | { kind: "exam"; examId: string };

export type LeaderboardEntry = {
  position: number;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
};

export type LeaderboardResult = {
  period: LeaderboardPeriod;
  scope: string;
  entries: LeaderboardEntry[];
  generatedAt: Date;
  source: "redis" | "postgres";
};

const DAY_TTL_SECONDS = 3 * 24 * 60 * 60;
const WEEK_TTL_SECONDS = 15 * 24 * 60 * 60;
const TOP_N = 50;

/**
 * Leaderboards em Redis Sorted Sets (Secao 11 do Prompt Mestre), com
 * fallback e re-hidratacao a partir do Postgres quando o Redis estiver
 * vazio ou indisponivel. Escopos: global e por concurso-alvo (targetExam
 * do onboarding).
 */
@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  scopeKey(scope: LeaderboardScope) {
    return scope.kind === "global" ? "global" : `exam:${scope.examId}`;
  }

  redisKey(scope: LeaderboardScope, period: LeaderboardPeriod, reference = new Date()) {
    const base = `lb:${this.scopeKey(scope)}`;
    if (period === "all") return `${base}:all`;
    if (period === "daily") return `${base}:d:${dateKey(reference)}`;
    return `${base}:w:${dateKey(weekStart(reference))}`;
  }

  /** Incrementa o XP do usuario em todos os ZSETs aplicaveis (best-effort). */
  async recordXp(userId: string, points: number, targetExamId: string | null) {
    const client = this.redis.getClient();
    if (!client || points <= 0) return;

    const scopes: LeaderboardScope[] = [{ kind: "global" }];
    if (targetExamId) scopes.push({ kind: "exam", examId: targetExamId });

    try {
      const pipeline = client.pipeline();
      for (const scope of scopes) {
        const daily = this.redisKey(scope, "daily");
        const weekly = this.redisKey(scope, "weekly");
        const all = this.redisKey(scope, "all");
        pipeline.zincrby(daily, points, userId);
        pipeline.expire(daily, DAY_TTL_SECONDS);
        pipeline.zincrby(weekly, points, userId);
        pipeline.expire(weekly, WEEK_TTL_SECONDS);
        pipeline.zincrby(all, points, userId);
      }
      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`Falha ao registrar XP no Redis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async leaderboard(period: LeaderboardPeriod, scope: LeaderboardScope = { kind: "global" }): Promise<LeaderboardResult> {
    const fromRedis = await this.readFromRedis(period, scope);
    if (fromRedis) return fromRedis;

    const result = await this.computeFromPostgres(period, scope);
    void this.hydrateRedis(period, scope, result.entries);
    return result;
  }

  /** Recomputa o ZSET a partir do Postgres (usado no fallback e em jobs de reparo). */
  async hydrateRedis(period: LeaderboardPeriod, scope: LeaderboardScope, entries: LeaderboardEntry[]) {
    const client = this.redis.getClient();
    if (!client || !entries.length) return;
    const key = this.redisKey(scope, period);
    try {
      const pipeline = client.pipeline();
      pipeline.del(key);
      pipeline.zadd(key, ...entries.flatMap((entry) => [entry.xp, entry.userId]));
      if (period === "daily") pipeline.expire(key, DAY_TTL_SECONDS);
      if (period === "weekly") pipeline.expire(key, WEEK_TTL_SECONDS);
      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`Falha ao hidratar leaderboard no Redis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async readFromRedis(period: LeaderboardPeriod, scope: LeaderboardScope): Promise<LeaderboardResult | null> {
    const client = this.redis.getClient();
    if (!client) return null;
    try {
      const raw = await client.zrevrange(this.redisKey(scope, period), 0, TOP_N - 1, "WITHSCORES");
      if (!raw.length) return null;
      const pairs: Array<{ userId: string; xp: number }> = [];
      for (let index = 0; index < raw.length; index += 2) {
        const userId = raw[index];
        if (!userId) continue;
        pairs.push({ userId, xp: Math.round(Number(raw[index + 1])) });
      }
      const users = await this.prisma.user.findMany({
        where: { id: { in: pairs.map((pair) => pair.userId) } },
        select: { id: true, nickname: true, avatarUrl: true }
      });
      const userById = new Map(users.map((user) => [user.id, user]));
      const entries = pairs.map((pair, index) => ({
        position: index + 1,
        userId: pair.userId,
        nickname: userById.get(pair.userId)?.nickname ?? "operador",
        avatarUrl: userById.get(pair.userId)?.avatarUrl ?? null,
        xp: pair.xp,
        level: levelForXp(pair.xp).level
      }));
      return { period, scope: this.scopeKey(scope), entries, generatedAt: new Date(), source: "redis" };
    } catch (error) {
      this.logger.warn(`Falha ao ler leaderboard do Redis: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async computeFromPostgres(period: LeaderboardPeriod, scope: LeaderboardScope): Promise<LeaderboardResult> {
    const since = periodStart(period);
    let userFilter: { in: string[] } | undefined;
    if (scope.kind === "exam") {
      const profiles = await this.prisma.onboardingProfile.findMany({
        where: { targetExamId: scope.examId },
        select: { userId: true }
      });
      userFilter = { in: profiles.map((profile) => profile.userId) };
      if (!userFilter.in.length) {
        return { period, scope: this.scopeKey(scope), entries: [], generatedAt: new Date(), source: "postgres" };
      }
    }

    const grouped = await this.prisma.xpEvent.groupBy({
      by: ["userId"],
      where: {
        revokedAt: null,
        ...(since ? { createdAt: { gte: since } } : {}),
        ...(userFilter ? { userId: userFilter } : {})
      },
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: TOP_N
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((entry) => entry.userId) } },
      select: { id: true, nickname: true, avatarUrl: true }
    });
    const userById = new Map(users.map((user) => [user.id, user]));
    const entries = grouped.map((entry, index) => {
      const xp = entry._sum.points ?? 0;
      const user = userById.get(entry.userId);
      return {
        position: index + 1,
        userId: entry.userId,
        nickname: user?.nickname ?? "operador",
        avatarUrl: user?.avatarUrl ?? null,
        xp,
        level: levelForXp(xp).level
      };
    });
    return { period, scope: this.scopeKey(scope), entries, generatedAt: new Date(), source: "postgres" };
  }
}

function periodStart(period: LeaderboardPeriod) {
  if (period === "all") return null;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (period === "weekly") date.setDate(date.getDate() - 6);
  return date;
}

function weekStart(reference: Date) {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = (day + 6) % 7; // segunda-feira como inicio da semana
  date.setDate(date.getDate() - diff);
  return date;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
