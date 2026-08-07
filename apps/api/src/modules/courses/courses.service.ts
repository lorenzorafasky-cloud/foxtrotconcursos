import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { LessonAssetType } from "@foxtrot/database";
import { PrismaService } from "../../core/prisma.service";
import { hasCourseEntitlement } from "./entitlements";
import { MediaService } from "../media/media.service";
import { AuthUser } from "../../security/auth-user.decorator";

type LessonAssetForClient = {
  id: string;
  type: LessonAssetType;
  metadata: unknown;
  storage: { provider: string; bucket?: string; key?: string };
  canDownload: boolean;
};

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService
  ) {}

  async list(filters: { q?: string; careerId?: string; boardId?: string; status?: "PRE_EDITAL" | "POS_EDITAL" }) {
    const courses = await this.prisma.course.findMany({
      where: {
        publishedAt: { not: null },
        careerId: filters.careerId,
        boardId: filters.boardId,
        status: filters.status,
        OR: filters.q
          ? [
              { title: { contains: filters.q, mode: "insensitive" } },
              { description: { contains: filters.q, mode: "insensitive" } }
            ]
          : undefined
      },
      include: {
        career: true,
        board: true,
        modules: { include: { lessons: { where: { publishedAt: { not: null } } } } }
      },
      orderBy: { publishedAt: "desc" }
    });
    return courses.map((course) => this.withCourseStats(course));
  }

  async myCourses(userId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            career: true,
            board: true,
            modules: {
              orderBy: { position: "asc" },
              include: { lessons: { where: { publishedAt: { not: null } }, orderBy: { position: "asc" } } }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });
    const progress = await this.progressByCourse(userId, enrollments.map((enrollment) => enrollment.courseId));
    return enrollments.map((enrollment) => ({
      ...enrollment,
      course: this.withCourseStats(enrollment.course, progress.get(enrollment.courseId))
    }));
  }

  async detail(slug: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        career: true,
        board: true,
        modules: {
          orderBy: { position: "asc" },
          include: { lessons: { where: { publishedAt: { not: null } }, orderBy: { position: "asc" } } }
        }
      }
    });
    if (!course) throw new NotFoundException("Curso nao encontrado.");
    const allowed = await this.hasCourseAccess(userId, course.id);
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } }
    });
    const progress = await this.progressByCourse(userId, [course.id]);
    return {
      ...this.withCourseStats(course, progress.get(course.id)),
      allowed,
      enrolled: Boolean(enrollment)
    };
  }

  async enroll(slug: string, userId: string) {
    const course = await this.prisma.course.findUnique({ where: { slug } });
    if (!course || !course.publishedAt) throw new NotFoundException("Curso nao encontrado.");
    const allowed = await this.hasCourseAccess(userId, course.id);
    if (!allowed) throw new ForbiddenException("Voce ainda nao tem acesso a este curso.");
    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      update: { updatedAt: new Date() },
      create: { userId, courseId: course.id }
    });
    return { ok: true, enrollment };
  }

  async lesson(id: string, userId: string) {
    const { lesson, allowed } = await this.findLessonForStudent(id, userId);
    if (!allowed) return { allowed: false, lesson: null };
    return {
      allowed: true,
      lesson: {
        ...lesson,
        assets: lesson.assets.map((asset) => this.assetForClient(asset)),
        progress: lesson.progress[0] ?? null,
        rating: lesson.ratings[0] ?? null
      }
    };
  }

  async progress(userId: string, lessonId: string, watchedSeconds: number, completed = false) {
    if (!Number.isFinite(watchedSeconds) || watchedSeconds < 0) {
      throw new BadRequestException("Tempo assistido invalido.");
    }
    const { lesson, allowed } = await this.findLessonForStudent(lessonId, userId);
    if (!allowed) throw new ForbiddenException("Voce ainda nao tem acesso a esta aula.");
    await this.ensureEnrollment(userId, lesson.module.courseId);
    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { watchedSeconds, completedAt: completed ? new Date() : undefined },
      create: { userId, lessonId, watchedSeconds, completedAt: completed ? new Date() : undefined }
    });
  }

  async rate(userId: string, lessonId: string, score: number, comment?: string) {
    if (!Number.isInteger(score) || score < 1 || score > 5) throw new BadRequestException("A avaliacao deve ser de 1 a 5.");
    const { lesson, allowed } = await this.findLessonForStudent(lessonId, userId);
    if (!allowed) throw new ForbiddenException("Voce ainda nao tem acesso a esta aula.");
    await this.ensureEnrollment(userId, lesson.module.courseId);
    return this.prisma.lessonRating.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { score, comment },
      create: { userId, lessonId, score, comment }
    });
  }

  async createDoubt(userId: string, lessonId: string, message: string) {
    if (!message.trim()) throw new BadRequestException("Informe a duvida da aula.");
    const { allowed } = await this.findLessonForStudent(lessonId, userId);
    if (!allowed) throw new ForbiddenException("Voce ainda nao tem acesso a esta aula.");
    return this.prisma.lessonDoubt.create({ data: { userId, lessonId, message } });
  }

  async streamPlayback(userId: string, lessonId: string) {
    const { lesson, allowed } = await this.findLessonForStudent(lessonId, userId);
    if (!allowed) return { allowed: false };
    if (!lesson.streamVideoUid) throw new NotFoundException("Video nao configurado para esta aula.");
    return { allowed: true, playback: this.media.createStreamPlayback(lesson.streamVideoUid) };
  }

  async downloadMaterial(userId: string, lessonId: string, assetId: string) {
    const { lesson, allowed } = await this.findLessonForStudent(lessonId, userId);
    if (!allowed) throw new ForbiddenException("Voce ainda nao tem acesso a esta aula.");
    const asset = lesson.assets.find((item) => item.id === assetId);
    if (!asset) throw new NotFoundException("Material nao encontrado.");
    return this.media.createMaterialDownload(asset);
  }

  async answerDoubt(actor: AuthUser, doubtId: string, answer: string) {
    if (!answer.trim()) throw new BadRequestException("Informe a resposta da duvida.");
    const doubt = await this.prisma.lessonDoubt.findUnique({
      where: { id: doubtId },
      include: { lesson: true }
    });
    if (!doubt) throw new NotFoundException("Duvida nao encontrada.");

    if (!actor.roles.includes("ADMIN_MASTER")) {
      const subject = await this.prisma.professorSubject.findUnique({
        where: { userId_subjectId: { userId: actor.id, subjectId: doubt.lesson.subjectId } }
      });
      if (!subject) throw new ForbiddenException("Professor sem permissao para responder esta aula.");
    }

    return this.prisma.lessonDoubt.update({
      where: { id: doubtId },
      data: { answer, answeredAt: new Date() }
    });
  }

  private async hasCourseAccess(userId: string, courseId: string) {
    const now = new Date();
    const entitlements = await this.prisma.entitlement.findMany({
      where: {
        userId,
        startsAt: { lte: now },
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          { OR: [{ type: "UNLIMITED" }, { type: "COURSE", courseId }] }
        ]
      }
    });
    return hasCourseEntitlement(entitlements, courseId, now);
  }

  private ensureEnrollment(userId: string, courseId: string) {
    return this.prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { updatedAt: new Date() },
      create: { userId, courseId }
    });
  }

  private async findLessonForStudent(id: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        module: { include: { course: true } },
        subject: true,
        topic: true,
        teacher: { select: { id: true, nickname: true, fullName: true } },
        assets: true,
        doubts: { orderBy: { createdAt: "desc" } },
        progress: { where: { userId } },
        ratings: { where: { userId } }
      }
    });
    if (!lesson || !lesson.publishedAt) throw new NotFoundException("Aula nao encontrada.");
    const allowed = await this.hasCourseAccess(userId, lesson.module.courseId);
    return { lesson, allowed };
  }

  private assetForClient(asset: { id: string; type: LessonAssetType; url: string; metadata: unknown }): LessonAssetForClient {
    return {
      id: asset.id,
      type: asset.type,
      metadata: asset.metadata,
      storage: this.media.describeStorage(asset.url),
      canDownload: this.canDownloadAsset(asset.metadata)
    };
  }

  private canDownloadAsset(metadata: unknown) {
    if (!metadata || typeof metadata !== "object") return true;
    return (metadata as { downloadable?: unknown }).downloadable !== false;
  }

  private async progressByCourse(userId: string, courseIds: string[]) {
    if (!courseIds.length) return new Map<string, { completedLessons: number; watchedSeconds: number }>();
    const progress = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: { module: { courseId: { in: courseIds } } }
      },
      include: { lesson: { include: { module: true } } }
    });
    const byCourse = new Map<string, { completedLessons: number; watchedSeconds: number }>();
    for (const item of progress) {
      const courseId = item.lesson.module.courseId;
      const current = byCourse.get(courseId) ?? { completedLessons: 0, watchedSeconds: 0 };
      current.watchedSeconds += item.watchedSeconds;
      if (item.completedAt) current.completedLessons += 1;
      byCourse.set(courseId, current);
    }
    return byCourse;
  }

  private withCourseStats(
    course: {
      modules: Array<{ lessons: Array<{ id: string; durationSeconds?: number | null; completedAt?: Date | null }> }>;
    },
    progress?: { completedLessons: number; watchedSeconds: number }
  ) {
    const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);
    const workloadSeconds = course.modules.reduce(
      (total, module) => total + module.lessons.reduce((sum, lesson) => sum + (lesson.durationSeconds ?? 0), 0),
      0
    );
    const completedLessons = progress?.completedLessons ?? 0;
    return {
      ...course,
      stats: {
        moduleCount: course.modules.length,
        lessonCount,
        workloadSeconds,
        completedLessons,
        watchedSeconds: progress?.watchedSeconds ?? 0,
        progressPercent: lessonCount ? Math.round((completedLessons / lessonCount) * 100) : 0
      }
    };
  }
}
