import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { CreateCourseDto, ImportQuestionDto } from "./admin.dto";
import { normalizeQuestionImport } from "./question-import";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return Promise.all([
      this.prisma.user.count(),
      this.prisma.course.count(),
      this.prisma.question.count(),
      this.prisma.payment.groupBy({ by: ["status"], _sum: { amountCents: true }, _count: true })
    ]).then(([users, courses, questions, payments]) => ({ users, courses, questions, payments }));
  }

  async createCourse(data: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        status: data.status,
        careerId: data.careerId,
        boardId: data.boardId,
        area: data.area
      }
    });
  }

  async publishCourse(courseId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: { publishedAt: new Date() }
    });
  }

  async importQuestions(questions: ImportQuestionDto[]) {
    const results = [];
    for (const rawInput of questions) {
      const input = { ...rawInput, ...normalizeQuestionImport(rawInput) };
      const [board, career, subject, institution, position] = await Promise.all([
        this.prisma.board.upsert({ where: { name: input.board }, update: {}, create: { name: input.board } }),
        this.prisma.career.upsert({ where: { name: input.career }, update: {}, create: { name: input.career } }),
        this.prisma.subject.upsert({ where: { name: input.subject }, update: {}, create: { name: input.subject } }),
        this.prisma.institution.upsert({
          where: { name: input.institution },
          update: {},
          create: { name: input.institution }
        }),
        this.prisma.position.upsert({ where: { name: input.position }, update: {}, create: { name: input.position } })
      ]);
      const topic = input.topic
        ? await this.prisma.topic.upsert({
            where: { subjectId_name: { subjectId: subject.id, name: input.topic } },
            update: {},
            create: { subjectId: subject.id, name: input.topic }
          })
        : null;

      results.push(
        await this.prisma.question.upsert({
          where: { code: input.code },
          update: {
            kind: input.kind,
            statement: input.statement,
            alternatives: input.alternatives as object,
            correctAnswer: input.correctAnswer,
            year: input.year,
            boardId: board.id,
            careerId: career.id,
            subjectId: subject.id,
            topicId: topic?.id,
            institutionId: institution.id,
            positionId: position.id,
            sourceExam: input.sourceExam,
            explanation: input.explanation
          },
          create: {
            code: input.code,
            kind: input.kind,
            statement: input.statement,
            alternatives: input.alternatives as object,
            correctAnswer: input.correctAnswer,
            year: input.year,
            boardId: board.id,
            careerId: career.id,
            subjectId: subject.id,
            topicId: topic?.id,
            institutionId: institution.id,
            positionId: position.id,
            sourceExam: input.sourceExam,
            explanation: input.explanation
          }
        })
      );
    }
    return { imported: results.length, questions: results };
  }

  users() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, fullName: true, nickname: true, roles: { include: { role: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  featureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  }

  setFeatureFlag(key: "PSYCHOLOGY" | "MENTAL_SUPPORT" | "RECREIO" | "LIVE_CLASSES", enabled: boolean) {
    return this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled },
      create: { key, enabled }
    });
  }

  audit() {
    return this.prisma.auditLog.findMany({
      include: { actor: { select: { email: true, nickname: true } }, subject: { select: { email: true, nickname: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async impersonate(actorId: string, subjectId: string, metadata?: unknown) {
    await this.prisma.auditLog.create({
      data: { actorId, subjectId, action: "admin.impersonate", entityType: "User", entityId: subjectId, metadata: metadata as object }
    });
    return { subjectId, impersonationStartedAt: new Date().toISOString() };
  }
}
