import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { hasCourseEntitlement } from "./entitlements";
import { MediaService } from "../media/media.service";

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService
  ) {}

  list(filters: { q?: string; careerId?: string; boardId?: string; status?: "PRE_EDITAL" | "POS_EDITAL" }) {
    return this.prisma.course.findMany({
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
      include: { career: true, board: true, modules: { include: { lessons: true } } },
      orderBy: { publishedAt: "desc" }
    });
  }

  async detail(slug: string, userId: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        career: true,
        board: true,
        modules: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" } } } }
      }
    });
    if (!course) throw new NotFoundException("Curso nao encontrado.");
    const allowed = await this.hasCourseAccess(userId, course.id);
    return { ...course, allowed };
  }

  async lesson(id: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        module: { include: { course: true } },
        subject: true,
        topic: true,
        teacher: { select: { id: true, nickname: true, fullName: true } },
        assets: true,
        doubts: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!lesson) throw new NotFoundException("Aula nao encontrada.");
    const allowed = await this.hasCourseAccess(userId, lesson.module.courseId);
    if (!allowed) return { allowed: false, lesson: null };
    return { allowed: true, lesson };
  }

  progress(userId: string, lessonId: string, watchedSeconds: number, completed = false) {
    return this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { watchedSeconds, completedAt: completed ? new Date() : undefined },
      create: { userId, lessonId, watchedSeconds, completedAt: completed ? new Date() : undefined }
    });
  }

  rate(userId: string, lessonId: string, score: number, comment?: string) {
    return this.prisma.lessonRating.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: { score, comment },
      create: { userId, lessonId, score, comment }
    });
  }

  createDoubt(userId: string, lessonId: string, message: string) {
    return this.prisma.lessonDoubt.create({ data: { userId, lessonId, message } });
  }

  async streamPlayback(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true }
    });
    if (!lesson) throw new NotFoundException("Aula nao encontrada.");
    const allowed = await this.hasCourseAccess(userId, lesson.module.courseId);
    if (!allowed) return { allowed: false };
    if (!lesson.streamVideoUid) throw new NotFoundException("Video nao configurado para esta aula.");
    return { allowed: true, playback: this.media.createStreamPlayback(lesson.streamVideoUid) };
  }

  answerDoubt(doubtId: string, answer: string) {
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
}
