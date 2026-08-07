import { BadRequestException, ForbiddenException, Injectable, Optional } from "@nestjs/common";
import { FocusMode, Prisma } from "@foxtrot/database";
import { PrismaService } from "../../core/prisma.service";
import { GamificationService } from "../gamification/gamification.service";
import { rankForXp } from "./ranks";
import { addDays, reviewFlashcardState } from "./srs";

type FocusSessionInput = { mode: FocusMode; grossSeconds: number; netSeconds: number; taskId?: string; startedAt?: string };
type PreferenceInput = {
  focusMode?: FocusMode;
  pomodoroSeconds?: number;
  breakSeconds?: number;
  longBreakSeconds?: number;
  autoStartBreaks?: boolean;
  soundSettings?: Prisma.InputJsonValue;
};

@Injectable()
export class FocusService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gamification?: GamificationService
  ) {}

  async startSession(userId: string, data: FocusSessionInput) {
    this.validateSession(data);
    if (data.taskId) await this.assertTaskOwner(userId, data.taskId);
    const session = await this.prisma.focusSession.create({
      data: {
        userId,
        taskId: data.taskId,
        mode: data.mode,
        grossSeconds: Math.round(data.grossSeconds),
        netSeconds: Math.round(data.netSeconds),
        startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
        endedAt: new Date()
      }
    });
    const points = Math.max(1, Math.floor(data.netSeconds / 60));
    await this.awardXp(userId, "focus:net-minutes", points, { sessionId: session.id, taskId: data.taskId }, `focus:${session.id}:${userId}`);
    return session;
  }

  async dashboard(userId: string) {
    const [sessions, xp, preferences, tasks, dueFlashcards] = await Promise.all([
      this.prisma.focusSession.findMany({ where: { userId, startedAt: { gte: daysAgo(29) } }, include: { task: true }, orderBy: { startedAt: "desc" } }),
      this.prisma.xpEvent.aggregate({ where: { userId }, _sum: { points: true } }),
      this.preferences(userId),
      this.prisma.studyTask.findMany({ where: { list: { userId }, completedAt: null }, orderBy: [{ dueDate: "asc" }, { title: "asc" }], take: 25 }),
      this.prisma.flashcard.findMany({ where: { userId, dueAt: { lte: new Date() } }, orderBy: { dueAt: "asc" }, take: 20 })
    ]);
    const totalXp = xp._sum.points ?? 0;
    const consistency = consistencyFromSessions(sessions);
    return {
      netSecondsToday: sessions.filter((session) => dateKey(session.startedAt) === dateKey(new Date())).reduce((sum, session) => sum + session.netSeconds, 0),
      weeklyNetSeconds: consistency.weeklyNetSeconds,
      totalXp,
      rank: rankForXp(totalXp),
      streakDays: consistency.streakDays,
      consistency,
      sessions: sessions.slice(0, 20),
      tasks,
      dueFlashcards,
      preferences
    };
  }

  async preferences(userId: string) {
    return this.prisma.userProductivityPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        soundSettings: {
          rain: 20,
          fire: 0,
          storm: 0,
          whiteNoise: 15,
          pinkNoise: 0
        }
      }
    });
  }

  updatePreferences(userId: string, data: PreferenceInput) {
    if (data.focusMode && !Object.values(FocusMode).includes(data.focusMode)) throw new BadRequestException("Modo de foco invalido.");
    return this.prisma.userProductivityPreference.upsert({
      where: { userId },
      update: {
        focusMode: data.focusMode,
        pomodoroSeconds: clampSeconds(data.pomodoroSeconds, 300, 7200),
        breakSeconds: clampSeconds(data.breakSeconds, 60, 3600),
        longBreakSeconds: clampSeconds(data.longBreakSeconds, 300, 7200),
        autoStartBreaks: data.autoStartBreaks,
        soundSettings: data.soundSettings
      },
      create: {
        userId,
        focusMode: data.focusMode ?? "POMODORO",
        pomodoroSeconds: clampSeconds(data.pomodoroSeconds, 300, 7200) ?? 1500,
        breakSeconds: clampSeconds(data.breakSeconds, 60, 3600) ?? 300,
        longBreakSeconds: clampSeconds(data.longBreakSeconds, 300, 7200) ?? 900,
        autoStartBreaks: data.autoStartBreaks ?? false,
        soundSettings: data.soundSettings ?? {}
      }
    });
  }

  async leaderboard(period: "daily" | "weekly" | "all" = "weekly") {
    const since = new Date();
    if (period === "daily") since.setHours(0, 0, 0, 0);
    if (period === "weekly") since.setDate(since.getDate() - 7);
    const grouped = await this.prisma.xpEvent.groupBy({
      by: ["userId"],
      where: period === "all" ? {} : { createdAt: { gte: since } },
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 25
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((entry) => entry.userId) } },
      select: { id: true, nickname: true }
    });
    return grouped.map((entry, index) => {
      const totalXp = entry._sum.points ?? 0;
      return {
        position: index + 1,
        userId: entry.userId,
        nickname: users.find((user) => user.id === entry.userId)?.nickname ?? "operador",
        xp: totalXp,
        rank: rankForXp(totalXp)
      };
    });
  }

  flashcards(userId: string, filter: "due" | "favorites" | "all" = "all") {
    return this.prisma.flashcard.findMany({
      where: {
        userId,
        dueAt: filter === "due" ? { lte: new Date() } : undefined,
        favorite: filter === "favorites" ? true : undefined
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }]
    });
  }

  createFlashcard(userId: string, data: { front: string; back: string; subjectId?: string; topicId?: string; favorite?: boolean }) {
    if (!data.front.trim() || !data.back.trim()) throw new BadRequestException("Informe frente e verso do flashcard.");
    return this.prisma.flashcard.create({
      data: {
        userId,
        front: data.front.trim(),
        back: data.back.trim(),
        subjectId: data.subjectId,
        topicId: data.topicId,
        favorite: data.favorite ?? false
      }
    });
  }

  async reviewFlashcard(userId: string, flashcardId: string, quality: number) {
    const flashcard = await this.prisma.flashcard.findFirstOrThrow({ where: { id: flashcardId, userId } });
    const next = reviewFlashcardState(
      {
        easeFactor: flashcard.easeFactor,
        intervalDays: flashcard.intervalDays,
        repetitions: flashcard.repetitions
      },
      quality
    );
    const updated = await this.prisma.flashcard.update({
      where: { id: flashcard.id },
      data: {
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        dueAt: addDays(new Date(), next.intervalDays)
      }
    });
    await this.awardXp(userId, "flashcard:review", Math.max(1, Math.min(3, quality)), { flashcardId }, `flashcard:${flashcardId}:${flashcard.repetitions}:${userId}`);
    return updated;
  }

  async favoriteFlashcard(userId: string, flashcardId: string, favorite: boolean) {
    const flashcard = await this.prisma.flashcard.findFirst({ where: { id: flashcardId, userId } });
    if (!flashcard) throw new ForbiddenException("Flashcard indisponivel para este aluno.");
    return this.prisma.flashcard.update({ where: { id: flashcardId }, data: { favorite } });
  }

  postIts(userId: string) {
    return this.prisma.postIt.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  }

  createPostIt(userId: string, data: { body: string; color: string; position?: unknown }) {
    if (!data.body.trim()) throw new BadRequestException("Informe o conteudo do post-it.");
    return this.prisma.postIt.create({ data: { userId, body: data.body.trim(), color: data.color, position: data.position as object } });
  }

  private validateSession(data: FocusSessionInput) {
    if (!Object.values(FocusMode).includes(data.mode)) throw new BadRequestException("Modo de foco invalido.");
    if (!Number.isFinite(data.grossSeconds) || data.grossSeconds < 1) throw new BadRequestException("Tempo bruto invalido.");
    if (!Number.isFinite(data.netSeconds) || data.netSeconds < 1) throw new BadRequestException("Tempo liquido invalido.");
    if (data.netSeconds > data.grossSeconds) throw new BadRequestException("Tempo liquido nao pode exceder tempo bruto.");
  }

  private async assertTaskOwner(userId: string, taskId: string) {
    const task = await this.prisma.studyTask.findFirst({ where: { id: taskId, list: { userId } } });
    if (!task) throw new ForbiddenException("Tarefa indisponivel para este aluno.");
  }

  private async awardXp(userId: string, source: string, points: number, metadata: Prisma.InputJsonValue, idempotencyKey: string) {
    if (this.gamification) {
      await this.gamification.awardXp(userId, source, points, metadata, idempotencyKey);
      return;
    }
    await this.prisma.xpEvent.create({ data: { userId, source, points, metadata } });
  }
}

function clampSeconds(value: number | undefined, min: number, max: number) {
  if (value === undefined) return undefined;
  return Math.min(Math.max(Math.round(value), min), max);
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

function consistencyFromSessions(sessions: Array<{ startedAt: Date; netSeconds: number }>) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = daysAgo(13 - index);
    const key = dateKey(date);
    const netSeconds = sessions.filter((session) => dateKey(session.startedAt) === key).reduce((sum, session) => sum + session.netSeconds, 0);
    return { date: key, netSeconds, active: netSeconds > 0 };
  });
  let streakDays = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (!days[index]?.active) break;
    streakDays += 1;
  }
  return {
    days,
    streakDays,
    activeDays: days.filter((day) => day.active).length,
    weeklyNetSeconds: days.slice(-7).reduce((sum, day) => sum + day.netSeconds, 0)
  };
}
