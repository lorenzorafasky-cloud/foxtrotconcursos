import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { Prisma, QuestionKind, SimulationStatus } from "@foxtrot/database";
import { PrismaService } from "../../core/prisma.service";
import { AiService } from "../ai/ai.service";
import { GamificationService } from "../gamification/gamification.service";

type QuestionListQuery = {
  boardId?: string;
  careerId?: string;
  subjectId?: string;
  topicId?: string;
  year?: string;
  yearFrom?: string;
  yearTo?: string;
  institutionId?: string;
  positionId?: string;
  code?: string;
  q?: string;
  kind?: QuestionKind;
  answered?: "correct" | "incorrect" | "unanswered";
  favorite?: string;
  hasExplanation?: string;
  take?: string;
};

type AttemptInput = {
  selectedAnswer?: string;
  discursiveAnswer?: string;
  timeSeconds?: number;
  simulationId?: string;
};

type SimulationInput = {
  title?: string;
  questionCount?: number;
  filters?: QuestionListQuery;
};

const questionCatalogInclude = {
  board: true,
  career: true,
  subject: true,
  topic: true,
  institution: true,
  position: true
} satisfies Prisma.QuestionInclude;

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    @Optional() private readonly gamification?: GamificationService
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
      positions,
      kinds: Object.values(QuestionKind)
    }));
  }

  list(userId: string, query: QuestionListQuery) {
    return this.prisma.question.findMany({
      where: this.buildQuestionWhere(query, userId),
      include: {
        ...questionCatalogInclude,
        favorites: { where: { userId }, select: { id: true } },
        attempts: {
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, selectedAnswer: true, isCorrect: true, createdAt: true }
        }
      },
      take: this.parseTake(query.take),
      orderBy: [{ year: "desc" }, { code: "asc" }]
    });
  }

  favorites(userId: string) {
    return this.prisma.questionFavorite.findMany({
      where: { userId },
      include: { question: { include: questionCatalogInclude } },
      orderBy: { createdAt: "desc" }
    });
  }

  favorite(userId: string, questionId: string) {
    return this.prisma.questionFavorite.upsert({
      where: { userId_questionId: { userId, questionId } },
      update: {},
      create: { userId, questionId }
    });
  }

  async unfavorite(userId: string, questionId: string) {
    await this.prisma.questionFavorite.deleteMany({ where: { userId, questionId } });
    return { ok: true };
  }

  async detail(userId: string, id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        ...questionCatalogInclude,
        aiAnswer: true,
        favorites: { where: { userId }, select: { id: true } },
        attempts: {
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5
        },
        answers: { include: { user: { select: { nickname: true } } }, orderBy: { upvotes: "desc" } },
        essayRubric: true,
        submissions: {
          where: { studentId: userId },
          orderBy: { createdAt: "desc" },
          take: 3
        }
      }
    });
    if (!question) throw new NotFoundException("Questao nao encontrada.");
    return question;
  }

  async attempt(userId: string, questionId: string, input: AttemptInput) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException("Questao nao encontrada.");

    if (input.simulationId) {
      await this.assertSimulationCanReceiveAttempt(userId, input.simulationId, questionId);
    }

    const timeSeconds = Number.isFinite(input.timeSeconds) ? Math.max(0, Math.round(input.timeSeconds ?? 0)) : 0;
    const discursiveBody = input.discursiveAnswer?.trim();
    const selectedAnswer = input.selectedAnswer?.trim();

    if (question.kind === QuestionKind.DISCURSIVE) {
      if (!discursiveBody) throw new BadRequestException("Informe a resposta discursiva.");
      const attempt = await this.prisma.questionAttempt.create({
        data: { userId, questionId, simulationId: input.simulationId, isCorrect: null, timeSeconds }
      });
      const submission = await this.prisma.essaySubmission.create({
        data: { studentId: userId, questionId, body: discursiveBody }
      });
      return { ...attempt, essaySubmission: submission, pendingCorrection: true };
    }

    if (!selectedAnswer) throw new BadRequestException("Selecione uma alternativa.");
    const isCorrect = question.correctAnswer ? question.correctAnswer === selectedAnswer : null;
    const attempt = await this.prisma.questionAttempt.create({
      data: { userId, questionId, simulationId: input.simulationId, selectedAnswer, isCorrect, timeSeconds }
    });
    if (isCorrect) {
      await this.awardXp(userId, "question:correct", 10, { questionId, simulationId: input.simulationId }, `question:${attempt.id}:${userId}`);
    }
    return attempt;
  }

  history(userId: string) {
    return this.prisma.questionAttempt.findMany({
      where: { userId },
      include: { question: { include: questionCatalogInclude }, simulation: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }

  reviewErrors(userId: string) {
    return this.prisma.questionAttempt.findMany({
      where: { userId, isCorrect: false },
      include: { question: { include: questionCatalogInclude }, simulation: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    });
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
    const bySubject = new Map<
      string,
      { subjectId: string; subject: string; total: number; correct: number; pending: number; timeSeconds: number; topics: Map<string, TopicStats> }
    >();
    for (const attempt of attempts) {
      const subjectKey = attempt.question.subjectId;
      const current = bySubject.get(subjectKey) ?? {
        subjectId: subjectKey,
        subject: attempt.question.subject.name,
        total: 0,
        correct: 0,
        pending: 0,
        timeSeconds: 0,
        topics: new Map<string, TopicStats>()
      };
      current.total += 1;
      current.correct += attempt.isCorrect ? 1 : 0;
      current.pending += attempt.isCorrect === null ? 1 : 0;
      current.timeSeconds += attempt.timeSeconds;

      const topicKey = attempt.question.topicId ?? "sem-assunto";
      const topic = current.topics.get(topicKey) ?? {
        topicId: attempt.question.topicId,
        topic: attempt.question.topic?.name ?? "Sem assunto",
        total: 0,
        correct: 0,
        pending: 0,
        timeSeconds: 0
      };
      topic.total += 1;
      topic.correct += attempt.isCorrect ? 1 : 0;
      topic.pending += attempt.isCorrect === null ? 1 : 0;
      topic.timeSeconds += attempt.timeSeconds;
      current.topics.set(topicKey, topic);
      bySubject.set(subjectKey, current);
    }
    return [...bySubject.values()].map((item) => ({
      subjectId: item.subjectId,
      subject: item.subject,
      total: item.total,
      correct: item.correct,
      pending: item.pending,
      accuracy: this.accuracy(item.correct, item.total - item.pending),
      averageTimeSeconds: this.average(item.timeSeconds, item.total),
      topics: [...item.topics.values()].map((topic) => ({
        ...topic,
        accuracy: this.accuracy(topic.correct, topic.total - topic.pending),
        averageTimeSeconds: this.average(topic.timeSeconds, topic.total)
      }))
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

  simulations(userId: string) {
    return this.prisma.simulation.findMany({
      where: { userId },
      include: {
        questions: { select: { id: true } },
        attempts: { select: { id: true, isCorrect: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 30
    });
  }

  async createSimulation(userId: string, input: SimulationInput) {
    const questionCount = Math.min(Math.max(Math.round(input.questionCount ?? 10), 1), 100);
    const filters = input.filters ?? {};
    const questions = await this.prisma.question.findMany({
      where: this.buildQuestionWhere(filters, userId),
      select: { id: true },
      orderBy: [{ year: "desc" }, { code: "asc" }],
      take: questionCount
    });
    if (questions.length === 0) throw new BadRequestException("Nenhuma questao encontrada para montar o simulado.");

    const simulation = await this.prisma.simulation.create({
      data: {
        userId,
        title: input.title?.trim() || "Simulado personalizado",
        questionCount: questions.length,
        filters: filters as Prisma.InputJsonValue,
        questions: {
          create: questions.map((question, index) => ({
            questionId: question.id,
            position: index + 1
          }))
        }
      }
    });
    return this.simulationDetail(userId, simulation.id);
  }

  async simulationDetail(userId: string, simulationId: string) {
    const simulation = await this.findSimulationForUser(userId, simulationId);
    const submitted = simulation.status === SimulationStatus.SUBMITTED;
    return {
      ...simulation,
      questions: simulation.questions.map((item) => ({
        ...item,
        question: submitted ? item.question : this.hideQuestionSolution(item.question)
      })),
      results: submitted ? await this.simulationResults(userId, simulationId) : undefined
    };
  }

  async simulationAttempt(userId: string, simulationId: string, questionId: string, input: AttemptInput) {
    return this.attempt(userId, questionId, { ...input, simulationId });
  }

  async submitSimulation(userId: string, simulationId: string) {
    await this.findSimulationForUser(userId, simulationId);
    await this.prisma.simulation.update({
      where: { id: simulationId },
      data: { status: SimulationStatus.SUBMITTED, submittedAt: new Date() }
    });
    return this.simulationResults(userId, simulationId);
  }

  async simulationResults(userId: string, simulationId: string) {
    const simulation = await this.findSimulationForUser(userId, simulationId);
    const essaySubmissions = await this.prisma.essaySubmission.findMany({
      where: { studentId: userId, questionId: { in: simulation.questions.map((item) => item.questionId) } },
      orderBy: { createdAt: "desc" }
    });
    const essayByQuestion = new Map(essaySubmissions.map((submission) => [submission.questionId, submission]));
    const items = simulation.questions.map((item) => {
      const latestAttempt = item.question.attempts[0] ?? null;
      return {
        id: item.id,
        position: item.position,
        question: item.question,
        attempt: latestAttempt,
        essaySubmission: item.question.kind === QuestionKind.DISCURSIVE ? essayByQuestion.get(item.questionId) ?? null : null,
        needsReview: latestAttempt?.isCorrect === false
      };
    });
    const answered = items.filter((item) => item.attempt).length;
    const correct = items.filter((item) => item.attempt?.isCorrect === true).length;
    const pending = items.filter((item) => item.attempt?.isCorrect === null).length;
    return {
      id: simulation.id,
      title: simulation.title,
      status: simulation.status,
      questionCount: simulation.questionCount,
      answered,
      correct,
      pending,
      accuracy: this.accuracy(correct, answered - pending),
      submittedAt: simulation.submittedAt,
      items
    };
  }

  private buildQuestionWhere(query: QuestionListQuery, userId: string): Prisma.QuestionWhereInput {
    const year = this.parseOptionalInt(query.year);
    const yearFrom = this.parseOptionalInt(query.yearFrom);
    const yearTo = this.parseOptionalInt(query.yearTo);
    return {
      boardId: query.boardId,
      careerId: query.careerId,
      subjectId: query.subjectId,
      topicId: query.topicId,
      year: year ?? (yearFrom || yearTo ? { gte: yearFrom, lte: yearTo } : undefined),
      institutionId: query.institutionId,
      positionId: query.positionId,
      kind: this.isQuestionKind(query.kind) ? query.kind : undefined,
      explanation: query.hasExplanation === "true" ? { not: null } : undefined,
      code: query.code ? { contains: query.code, mode: "insensitive" } : undefined,
      OR: query.q
        ? [
            { statement: { contains: query.q, mode: "insensitive" } },
            { code: { contains: query.q, mode: "insensitive" } },
            { sourceExam: { contains: query.q, mode: "insensitive" } }
          ]
        : undefined,
      favorites: query.favorite === "true" ? { some: { userId } } : undefined,
      attempts:
        query.answered === "unanswered"
          ? { none: { userId } }
          : query.answered === "correct"
            ? { some: { userId, isCorrect: true } }
            : query.answered === "incorrect"
              ? { some: { userId, isCorrect: false } }
              : undefined
    };
  }

  private async assertSimulationCanReceiveAttempt(userId: string, simulationId: string, questionId: string) {
    const simulation = await this.prisma.simulation.findFirst({
      where: { id: simulationId, userId },
      include: { questions: { where: { questionId }, select: { id: true } } }
    });
    if (!simulation) throw new NotFoundException("Simulado nao encontrado.");
    if (simulation.status === SimulationStatus.SUBMITTED) throw new ForbiddenException("Este simulado ja foi finalizado.");
    if (simulation.questions.length === 0) throw new ForbiddenException("Questao fora deste simulado.");
  }

  private findSimulationForUser(userId: string, simulationId: string) {
    return this.prisma.simulation
      .findFirst({
        where: { id: simulationId, userId },
        include: {
          questions: {
            include: {
              question: {
                include: {
                  ...questionCatalogInclude,
                  aiAnswer: true,
                  attempts: {
                    where: { userId, simulationId },
                    orderBy: { createdAt: "desc" },
                    take: 1
                  }
                }
              }
            },
            orderBy: { position: "asc" }
          }
        }
      })
      .then((simulation) => {
        if (!simulation) throw new NotFoundException("Simulado nao encontrado.");
        return simulation;
      });
  }

  private hideQuestionSolution<T extends { correctAnswer: string | null; explanation: string | null; aiAnswer?: unknown }>(question: T) {
    return { ...question, correctAnswer: null, explanation: null, aiAnswer: null };
  }

  private isQuestionKind(kind: string | undefined): kind is QuestionKind {
    return Boolean(kind && Object.values(QuestionKind).includes(kind as QuestionKind));
  }

  private parseTake(value: string | undefined) {
    const parsed = this.parseOptionalInt(value) ?? 50;
    return Math.min(Math.max(parsed, 1), 100);
  }

  private parseOptionalInt(value: string | undefined) {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : undefined;
  }

  private accuracy(correct: number, total: number) {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }

  private average(total: number, count: number) {
    return count > 0 ? Math.round(total / count) : 0;
  }

  private async awardXp(userId: string, source: string, points: number, metadata: Prisma.InputJsonValue, idempotencyKey: string) {
    if (this.gamification) {
      await this.gamification.awardXp(userId, source, points, metadata, idempotencyKey);
      return;
    }
    await this.prisma.xpEvent.create({ data: { userId, source, points, metadata } });
  }
}

type TopicStats = {
  topicId: string | null;
  topic: string;
  total: number;
  correct: number;
  pending: number;
  timeSeconds: number;
};
