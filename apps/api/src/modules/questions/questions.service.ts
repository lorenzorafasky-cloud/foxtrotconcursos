import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { AiService } from "../ai/ai.service";

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService
  ) {}

  filters() {
    return Promise.all([
      this.prisma.board.findMany({ orderBy: { name: "asc" } }),
      this.prisma.career.findMany({ orderBy: { name: "asc" } }),
      this.prisma.subject.findMany({ orderBy: { name: "asc" }, include: { topics: true } }),
      this.prisma.institution.findMany({ orderBy: { name: "asc" } }),
      this.prisma.position.findMany({ orderBy: { name: "asc" } })
    ]).then(([boards, careers, subjects, institutions, positions]) => ({
      boards,
      careers,
      subjects,
      institutions,
      positions
    }));
  }

  list(query: {
    boardId?: string;
    careerId?: string;
    subjectId?: string;
    topicId?: string;
    year?: string;
    institutionId?: string;
    positionId?: string;
    code?: string;
  }) {
    return this.prisma.question.findMany({
      where: {
        boardId: query.boardId,
        careerId: query.careerId,
        subjectId: query.subjectId,
        topicId: query.topicId,
        year: query.year ? Number(query.year) : undefined,
        institutionId: query.institutionId,
        positionId: query.positionId,
        code: query.code ? { contains: query.code, mode: "insensitive" } : undefined
      },
      include: { board: true, career: true, subject: true, topic: true, institution: true, position: true },
      take: 50,
      orderBy: [{ year: "desc" }, { code: "asc" }]
    });
  }

  async detail(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        board: true,
        career: true,
        subject: true,
        topic: true,
        institution: true,
        position: true,
        aiAnswer: true,
        answers: { include: { user: { select: { nickname: true } } }, orderBy: { upvotes: "desc" } }
      }
    });
    if (!question) throw new NotFoundException("Questao nao encontrada.");
    return question;
  }

  async attempt(userId: string, questionId: string, selectedAnswer: string | undefined, timeSeconds: number) {
    const question = await this.prisma.question.findUniqueOrThrow({ where: { id: questionId } });
    const isCorrect = question.correctAnswer && selectedAnswer ? question.correctAnswer === selectedAnswer : null;
    const attempt = await this.prisma.questionAttempt.create({
      data: { userId, questionId, selectedAnswer, isCorrect, timeSeconds }
    });
    if (isCorrect) {
      await this.prisma.xpEvent.create({
        data: { userId, source: "question:correct", points: 10, metadata: { questionId } }
      });
    }
    return attempt;
  }

  reaction(
    userId: string,
    questionId: string,
    difficulty: "EASY" | "MEDIUM" | "HARD",
    relevance: "RELEVANT" | "NOT_RELEVANT"
  ) {
    return this.prisma.questionReaction.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: { difficulty, relevance },
      create: { userId, questionId, difficulty, relevance }
    });
  }

  answer(userId: string, questionId: string, body: string, isOfficial = false) {
    return this.prisma.questionAnswer.create({ data: { userId, questionId, body, isOfficial } });
  }

  async aiAnswer(questionId: string) {
    const cached = await this.prisma.questionAiAnswer.findUnique({ where: { questionId } });
    if (cached) return cached;
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { subject: true, topic: true }
    });
    if (!question) throw new NotFoundException("Questao nao encontrada.");
    const body = await this.ai.answerQuestion(
      question.statement,
      `Materia: ${question.subject.name}. Assunto: ${question.topic?.name ?? "geral"}. Gabarito: ${question.correctAnswer ?? "discursiva"}.`
    );
    return this.prisma.questionAiAnswer.create({
      data: { questionId, body, model: process.env.ANTHROPIC_MODEL ?? "anthropic" }
    });
  }

  async performance(userId: string) {
    const attempts = await this.prisma.questionAttempt.findMany({
      where: { userId },
      include: { question: { include: { subject: true, topic: true } } }
    });
    const bySubject = new Map<string, { subject: string; total: number; correct: number; timeSeconds: number }>();
    for (const attempt of attempts) {
      const key = attempt.question.subjectId;
      const current = bySubject.get(key) ?? {
        subject: attempt.question.subject.name,
        total: 0,
        correct: 0,
        timeSeconds: 0
      };
      current.total += 1;
      current.correct += attempt.isCorrect ? 1 : 0;
      current.timeSeconds += attempt.timeSeconds;
      bySubject.set(key, current);
    }
    return [...bySubject.values()].map((item) => ({
      ...item,
      accuracy: item.total ? Math.round((item.correct / item.total) * 100) : 0,
      averageTimeSeconds: item.total ? Math.round(item.timeSeconds / item.total) : 0
    }));
  }

  notes(userId: string, filters: { subjectId?: string; topicId?: string; q?: string }) {
    return this.prisma.note.findMany({
      where: {
        userId,
        subjectId: filters.subjectId,
        topicId: filters.topicId,
        OR: filters.q
          ? [{ title: { contains: filters.q, mode: "insensitive" } }, { body: { contains: filters.q, mode: "insensitive" } }]
          : undefined
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  createNote(userId: string, data: { questionId?: string; subjectId?: string; topicId?: string; title: string; body: string }) {
    return this.prisma.note.create({ data: { userId, ...data } });
  }
}
