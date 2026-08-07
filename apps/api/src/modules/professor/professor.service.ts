import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CourseStatus, LessonAssetType, Prisma, QuestionKind } from "@foxtrot/database";
import { PrismaService } from "../../core/prisma.service";
import { AuthUser } from "../../security/auth-user.decorator";

type CourseInput = {
  title: string;
  slug: string;
  description: string;
  status: CourseStatus;
  careerId: string;
  boardId?: string;
  area: string;
  coverImageUrl?: string;
  workloadMinutes?: number;
};

type ModuleInput = {
  courseId: string;
  title: string;
  position: number;
};

type LessonInput = {
  moduleId: string;
  subjectId: string;
  topicId?: string;
  title: string;
  slug: string;
  description: string;
  position: number;
  streamVideoUid?: string;
  durationSeconds?: number;
};

type MaterialInput = {
  lessonId: string;
  type: LessonAssetType;
  url: string;
  metadata?: Prisma.InputJsonValue;
};

type QuestionInput = {
  code: string;
  kind: QuestionKind;
  statement: string;
  alternatives?: Prisma.InputJsonValue;
  correctAnswer?: string;
  year: number;
  boardId: string;
  careerId: string;
  subjectId: string;
  topicId?: string;
  institutionId: string;
  positionId: string;
  sourceExam?: string;
  explanation?: string;
};

type SimulationInput = {
  title: string;
  questionCount: number;
  filters?: {
    boardId?: string;
    careerId?: string;
    subjectId?: string;
    topicId?: string;
    year?: string;
    kind?: QuestionKind;
  };
};

@Injectable()
export class ProfessorService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(actor: AuthUser) {
    const subjectIds = await this.scopedSubjectIds(actor);
    const lessonScope = this.lessonScope(subjectIds);
    const questionScope = this.questionScope(subjectIds);
    const [doubts, essays, lessons, courses, students, questions, simulations] = await Promise.all([
      this.prisma.lessonDoubt.findMany({
        where: { answer: null, lesson: lessonScope },
        include: { lesson: { include: { module: { include: { course: true } }, subject: true } }, user: { select: { id: true, nickname: true, fullName: true } } },
        orderBy: { createdAt: "asc" },
        take: 30
      }),
      this.prisma.essaySubmission.findMany({
        where: { correctedAt: null, question: questionScope },
        include: { question: { include: { subject: true, topic: true } }, student: { select: { id: true, nickname: true, fullName: true } } },
        orderBy: { createdAt: "asc" },
        take: 30
      }),
      this.prisma.lesson.findMany({
        where: lessonScope,
        include: { subject: true, topic: true, module: { include: { course: true } }, assets: true },
        orderBy: [{ publishedAt: "desc" }, { position: "asc" }],
        take: 50
      }),
      this.prisma.course.findMany({
        include: {
          career: true,
          board: true,
          modules: {
            orderBy: { position: "asc" },
            include: { lessons: { where: lessonScope, orderBy: { position: "asc" }, include: { assets: true, subject: true, topic: true } } }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 50
      }),
      this.prisma.courseEnrollment.findMany({
        where: { course: { modules: { some: { lessons: { some: lessonScope } } } } },
        include: { user: { select: { id: true, nickname: true, fullName: true, email: true } }, course: true },
        orderBy: { updatedAt: "desc" },
        take: 30
      }),
      this.prisma.question.findMany({
        where: questionScope,
        include: { board: true, career: true, subject: true, topic: true, institution: true, position: true },
        orderBy: [{ year: "desc" }, { code: "asc" }],
        take: 30
      }),
      this.prisma.simulation.findMany({
        where: { userId: actor.id },
        include: { questions: { select: { id: true } }, attempts: { select: { id: true, isCorrect: true } } },
        orderBy: { createdAt: "desc" },
        take: 20
      })
    ]);
    return { doubts, essays, lessons, courses, students, questions, simulations };
  }

  async catalog(actor: AuthUser) {
    const subjectIds = await this.scopedSubjectIds(actor);
    const [boards, careers, subjects, institutions, positions, courses] = await Promise.all([
      this.prisma.board.findMany({ orderBy: { name: "asc" } }),
      this.prisma.career.findMany({ orderBy: { name: "asc" } }),
      this.prisma.subject.findMany({
        where: subjectIds ? { id: { in: subjectIds } } : undefined,
        include: { topics: { orderBy: { name: "asc" } } },
        orderBy: { name: "asc" }
      }),
      this.prisma.institution.findMany({ orderBy: { name: "asc" } }),
      this.prisma.position.findMany({ orderBy: { name: "asc" } }),
      this.prisma.course.findMany({
        include: {
          career: true,
          board: true,
          modules: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" } } } }
        },
        orderBy: { updatedAt: "desc" }
      })
    ]);
    return { boards, careers, subjects, institutions, positions, courses, courseStatuses: Object.values(CourseStatus), questionKinds: Object.values(QuestionKind), assetTypes: Object.values(LessonAssetType) };
  }

  createCourse(data: CourseInput) {
    this.validateCourse(data);
    return this.prisma.course.create({
      data: {
        title: data.title.trim(),
        slug: this.slug(data.slug),
        description: data.description.trim(),
        status: data.status,
        careerId: data.careerId,
        boardId: data.boardId || null,
        area: data.area.trim(),
        coverImageUrl: data.coverImageUrl?.trim() || null,
        workloadMinutes: Math.max(0, Math.round(data.workloadMinutes ?? 0))
      }
    });
  }

  updateCourse(id: string, data: Partial<CourseInput>) {
    if (data.title !== undefined && !data.title.trim()) throw new BadRequestException("Informe o titulo do curso.");
    if (data.description !== undefined && !data.description.trim()) throw new BadRequestException("Informe a descricao do curso.");
    return this.prisma.course.update({
      where: { id },
      data: {
        title: data.title?.trim(),
        slug: data.slug ? this.slug(data.slug) : undefined,
        description: data.description?.trim(),
        status: data.status,
        careerId: data.careerId,
        boardId: data.boardId,
        area: data.area?.trim(),
        coverImageUrl: data.coverImageUrl?.trim(),
        workloadMinutes: data.workloadMinutes === undefined ? undefined : Math.max(0, Math.round(data.workloadMinutes))
      }
    });
  }

  publishCourse(id: string) {
    return this.prisma.course.update({ where: { id }, data: { publishedAt: new Date() } });
  }

  createModule(data: ModuleInput) {
    if (!data.title.trim()) throw new BadRequestException("Informe o titulo do modulo.");
    if (!Number.isInteger(data.position) || data.position < 1) throw new BadRequestException("A posicao do modulo deve ser positiva.");
    return this.prisma.courseModule.create({
      data: { courseId: data.courseId, title: data.title.trim(), position: data.position }
    });
  }

  updateModule(id: string, data: Partial<ModuleInput>) {
    if (data.title !== undefined && !data.title.trim()) throw new BadRequestException("Informe o titulo do modulo.");
    if (data.position !== undefined && (!Number.isInteger(data.position) || data.position < 1)) {
      throw new BadRequestException("A posicao do modulo deve ser positiva.");
    }
    return this.prisma.courseModule.update({
      where: { id },
      data: { title: data.title?.trim(), position: data.position }
    });
  }

  async createLesson(actor: AuthUser, data: LessonInput) {
    await this.assertSubjectAccess(actor, data.subjectId);
    await this.assertTopicBelongsToSubject(data.subjectId, data.topicId);
    this.validateLesson(data);
    return this.prisma.lesson.create({
      data: {
        ...data,
        slug: this.slug(data.slug),
        title: data.title.trim(),
        description: data.description.trim(),
        topicId: data.topicId || null,
        teacherId: actor.id,
        durationSeconds: Math.max(0, Math.round(data.durationSeconds ?? 0))
      }
    });
  }

  async updateLesson(actor: AuthUser, id: string, data: Partial<LessonInput>) {
    const lesson = await this.assertLessonAccess(actor, id);
    const nextSubjectId = data.subjectId ?? lesson.subjectId;
    await this.assertSubjectAccess(actor, nextSubjectId);
    await this.assertTopicBelongsToSubject(nextSubjectId, data.topicId);
    return this.prisma.lesson.update({
      where: { id },
      data: {
        moduleId: data.moduleId,
        subjectId: data.subjectId,
        topicId: data.topicId,
        title: data.title?.trim(),
        slug: data.slug ? this.slug(data.slug) : undefined,
        description: data.description?.trim(),
        position: data.position,
        streamVideoUid: data.streamVideoUid,
        durationSeconds: data.durationSeconds === undefined ? undefined : Math.max(0, Math.round(data.durationSeconds))
      }
    });
  }

  async publishLesson(actor: AuthUser, lessonId: string) {
    await this.assertLessonAccess(actor, lessonId);
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { publishedAt: new Date() }
    });
  }

  async createMaterial(actor: AuthUser, data: MaterialInput) {
    await this.assertLessonAccess(actor, data.lessonId);
    if (!Object.values(LessonAssetType).includes(data.type)) throw new BadRequestException("Tipo de material invalido.");
    if (!data.url.trim()) throw new BadRequestException("Informe a URL ou chave de armazenamento do material.");
    return this.prisma.lessonAsset.create({
      data: {
        lessonId: data.lessonId,
        type: data.type,
        url: data.url.trim(),
        metadata: data.metadata ?? {}
      }
    });
  }

  async students(actor: AuthUser, courseId?: string) {
    const subjectIds = await this.scopedSubjectIds(actor);
    const lessonScope = this.lessonScope(subjectIds);
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: {
        courseId,
        course: { modules: { some: { lessons: { some: lessonScope } } } }
      },
      include: {
        user: { select: { id: true, fullName: true, nickname: true, email: true } },
        course: { include: { modules: { include: { lessons: { where: lessonScope } } } } }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    });
    const progress = await this.prisma.lessonProgress.findMany({
      where: {
        userId: { in: enrollments.map((item) => item.userId) },
        lesson: lessonScope
      },
      include: { lesson: { include: { module: true } } }
    });
    return enrollments.map((enrollment) => {
      const lessonIds = new Set(enrollment.course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)));
      const studentProgress = progress.filter((item) => item.userId === enrollment.userId && lessonIds.has(item.lessonId));
      const completedLessons = studentProgress.filter((item) => item.completedAt).length;
      return {
        ...enrollment,
        stats: {
          lessonCount: lessonIds.size,
          completedLessons,
          watchedSeconds: studentProgress.reduce((total, item) => total + item.watchedSeconds, 0),
          progressPercent: lessonIds.size ? Math.round((completedLessons / lessonIds.size) * 100) : 0
        }
      };
    });
  }

  async createQuestion(actor: AuthUser, data: QuestionInput) {
    await this.assertSubjectAccess(actor, data.subjectId);
    await this.assertTopicBelongsToSubject(data.subjectId, data.topicId);
    this.validateQuestion(data);
    return this.prisma.question.create({
      data: {
        code: data.code.trim().toUpperCase(),
        kind: data.kind,
        statement: data.statement.trim(),
        alternatives: data.alternatives,
        correctAnswer: data.kind === QuestionKind.DISCURSIVE ? null : data.correctAnswer?.trim(),
        year: data.year,
        boardId: data.boardId,
        careerId: data.careerId,
        subjectId: data.subjectId,
        topicId: data.topicId || null,
        institutionId: data.institutionId,
        positionId: data.positionId,
        sourceExam: data.sourceExam?.trim() || null,
        explanation: data.explanation?.trim() || null
      }
    });
  }

  async createSimulation(actor: AuthUser, data: SimulationInput) {
    if (!data.title.trim()) throw new BadRequestException("Informe o titulo do simulado.");
    const subjectIds = await this.scopedSubjectIds(actor);
    const filters = data.filters ?? {};
    if (subjectIds && filters.subjectId && !subjectIds.includes(filters.subjectId)) {
      throw new ForbiddenException("Professor sem permissao para esta materia.");
    }
    const where: Prisma.QuestionWhereInput = {
      ...this.questionScope(subjectIds),
      boardId: filters.boardId,
      careerId: filters.careerId,
      subjectId: filters.subjectId,
      topicId: filters.topicId,
      year: filters.year ? Number(filters.year) : undefined,
      kind: filters.kind
    };
    const questionCount = Math.min(Math.max(Math.round(data.questionCount), 1), 100);
    const questions = await this.prisma.question.findMany({
      where,
      select: { id: true },
      orderBy: [{ year: "desc" }, { code: "asc" }],
      take: questionCount
    });
    if (questions.length === 0) throw new BadRequestException("Nenhuma questao encontrada para o simulado.");
    return this.prisma.simulation.create({
      data: {
        userId: actor.id,
        title: data.title.trim(),
        questionCount: questions.length,
        filters: filters as Prisma.InputJsonValue,
        questions: {
          create: questions.map((question, index) => ({ questionId: question.id, position: index + 1 }))
        }
      },
      include: { questions: { include: { question: true }, orderBy: { position: "asc" } } }
    });
  }

  async essays(actor: AuthUser) {
    const subjectIds = await this.scopedSubjectIds(actor);
    return this.prisma.essaySubmission.findMany({
      where: { question: this.questionScope(subjectIds) },
      include: { question: { include: { subject: true, topic: true } }, student: { select: { id: true, nickname: true, fullName: true } } },
      orderBy: [{ correctedAt: "asc" }, { createdAt: "asc" }],
      take: 100
    });
  }

  async gradeEssay(actor: AuthUser, submissionId: string, data: { finalScore: number; finalFeedback: string }) {
    if (!Number.isFinite(data.finalScore) || data.finalScore < 0) throw new BadRequestException("Nota invalida.");
    if (!data.finalFeedback.trim()) throw new BadRequestException("Informe o feedback da correcao.");
    const submission = await this.prisma.essaySubmission.findUnique({
      where: { id: submissionId },
      include: { question: true }
    });
    if (!submission) throw new NotFoundException("Resposta discursiva nao encontrada.");
    await this.assertSubjectAccess(actor, submission.question.subjectId);
    if (submission.assignedTeacherId && submission.assignedTeacherId !== actor.id && !this.isAdmin(actor)) {
      throw new ForbiddenException("Resposta atribuida a outro professor.");
    }
    return this.prisma.essaySubmission.update({
      where: { id: submissionId },
      data: {
        assignedTeacherId: submission.assignedTeacherId ?? actor.id,
        finalScore: data.finalScore,
        finalFeedback: data.finalFeedback.trim(),
        correctedAt: new Date()
      }
    });
  }

  private async scopedSubjectIds(actor: AuthUser) {
    if (this.isAdmin(actor)) return null;
    const subjectLinks = await this.prisma.professorSubject.findMany({ where: { userId: actor.id } });
    return subjectLinks.map((link) => link.subjectId);
  }

  private async assertSubjectAccess(actor: AuthUser, subjectId: string) {
    if (this.isAdmin(actor)) return;
    const subject = await this.prisma.professorSubject.findUnique({
      where: { userId_subjectId: { userId: actor.id, subjectId } }
    });
    if (!subject) throw new ForbiddenException("Professor sem permissao para esta materia.");
  }

  private async assertLessonAccess(actor: AuthUser, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException("Aula nao encontrada.");
    await this.assertSubjectAccess(actor, lesson.subjectId);
    return lesson;
  }

  private async assertTopicBelongsToSubject(subjectId: string, topicId?: string) {
    if (!topicId) return;
    const topic = await this.prisma.topic.findFirst({ where: { id: topicId, subjectId } });
    if (!topic) throw new BadRequestException("Assunto nao pertence a materia informada.");
  }

  private lessonScope(subjectIds: string[] | null): Prisma.LessonWhereInput {
    return subjectIds ? { subjectId: { in: subjectIds } } : {};
  }

  private questionScope(subjectIds: string[] | null): Prisma.QuestionWhereInput {
    return subjectIds ? { subjectId: { in: subjectIds } } : {};
  }

  private validateCourse(data: CourseInput) {
    if (!data.title.trim()) throw new BadRequestException("Informe o titulo do curso.");
    if (!data.slug.trim()) throw new BadRequestException("Informe o slug do curso.");
    if (!data.description.trim()) throw new BadRequestException("Informe a descricao do curso.");
    if (!data.area.trim()) throw new BadRequestException("Informe a area do curso.");
    if (!Object.values(CourseStatus).includes(data.status)) throw new BadRequestException("Status de curso invalido.");
  }

  private validateLesson(data: LessonInput) {
    if (!data.title.trim()) throw new BadRequestException("Informe o titulo da aula.");
    if (!data.slug.trim()) throw new BadRequestException("Informe o slug da aula.");
    if (!data.description.trim()) throw new BadRequestException("Informe a descricao da aula.");
    if (!Number.isInteger(data.position) || data.position < 1) throw new BadRequestException("A posicao da aula deve ser positiva.");
  }

  private validateQuestion(data: QuestionInput) {
    if (!Object.values(QuestionKind).includes(data.kind)) throw new BadRequestException("Tipo de questao invalido.");
    if (!data.code.trim()) throw new BadRequestException("Informe o codigo da questao.");
    if (!data.statement.trim()) throw new BadRequestException("Informe o enunciado da questao.");
    if (!Number.isInteger(data.year) || data.year < 1900) throw new BadRequestException("Ano da questao invalido.");
    if (data.kind !== QuestionKind.DISCURSIVE && !data.correctAnswer?.trim()) {
      throw new BadRequestException("Informe o gabarito da questao objetiva.");
    }
    if (data.kind !== QuestionKind.DISCURSIVE && !Array.isArray(data.alternatives)) {
      throw new BadRequestException("Informe as alternativas da questao objetiva.");
    }
  }

  private slug(value: string) {
    const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) throw new BadRequestException("Slug invalido.");
    return slug;
  }

  private isAdmin(actor: AuthUser) {
    return actor.roles.includes("ADMIN_MASTER");
  }
}
