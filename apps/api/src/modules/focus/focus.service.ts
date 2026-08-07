import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { rankForXp } from "./ranks";
import { addDays, reviewFlashcardState } from "./srs";

@Injectable()
export class FocusService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(userId: string, data: { mode: "FREE" | "POMODORO"; grossSeconds: number; netSeconds: number; taskId?: string }) {
    const session = await this.prisma.focusSession.create({ data: { userId, ...data, endedAt: new Date() } });
    const points = Math.max(1, Math.floor(data.netSeconds / 60));
    await this.prisma.xpEvent.create({
      data: { userId, source: "focus:net-minutes", points, metadata: { sessionId: session.id } }
    });
    return session;
  }

  async dashboard(userId: string) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const [sessions, xp] = await Promise.all([
      this.prisma.focusSession.findMany({ where: { userId, startedAt: { gte: since } } }),
      this.prisma.xpEvent.aggregate({ where: { userId }, _sum: { points: true } })
    ]);
    const netSeconds = sessions.reduce((sum, session) => sum + session.netSeconds, 0);
    const totalXp = xp._sum.points ?? 0;
    return { netSecondsToday: netSeconds, totalXp, rank: rankForXp(totalXp), sessions };
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

  flashcards(userId: string) {
    return this.prisma.flashcard.findMany({ where: { userId }, orderBy: { dueAt: "asc" } });
  }

  createFlashcard(userId: string, data: { front: string; back: string; subjectId?: string; topicId?: string }) {
    return this.prisma.flashcard.create({ data: { userId, ...data } });
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
    return this.prisma.flashcard.update({
      where: { id: flashcard.id },
      data: {
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        dueAt: addDays(new Date(), next.intervalDays)
      }
    });
  }

  postIts(userId: string) {
    return this.prisma.postIt.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  }

  createPostIt(userId: string, data: { body: string; color: string; position?: unknown }) {
    return this.prisma.postIt.create({ data: { userId, body: data.body, color: data.color, position: data.position as object } });
  }
}
