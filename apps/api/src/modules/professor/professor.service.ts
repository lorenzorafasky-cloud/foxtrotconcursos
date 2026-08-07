import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";

@Injectable()
export class ProfessorService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(teacherId: string) {
    const subjectLinks = await this.prisma.professorSubject.findMany({ where: { userId: teacherId } });
    const subjectIds = subjectLinks.map((link) => link.subjectId);
    const [doubts, essays, lessons] = await Promise.all([
      this.prisma.lessonDoubt.findMany({
        where: { answer: null, lesson: { subjectId: { in: subjectIds } } },
        include: { lesson: true, user: { select: { nickname: true } } },
        orderBy: { createdAt: "asc" }
      }),
      this.prisma.essaySubmission.findMany({
        where: { assignedTeacherId: teacherId, correctedAt: null },
        include: { question: { include: { subject: true, topic: true } }, student: { select: { nickname: true } } },
        orderBy: { createdAt: "asc" }
      }),
      this.prisma.lesson.findMany({
        where: { teacherId },
        include: { subject: true, topic: true },
        orderBy: { position: "asc" }
      })
    ]);
    return { doubts, essays, lessons };
  }

  createLesson(
    teacherId: string,
    data: {
      moduleId: string;
      subjectId: string;
      topicId?: string;
      title: string;
      slug: string;
      description: string;
      position: number;
      streamVideoUid?: string;
      durationSeconds?: number;
    }
  ) {
    return this.prisma.lesson.create({
      data: {
        ...data,
        teacherId,
        durationSeconds: data.durationSeconds ?? 0
      }
    });
  }

  publishLesson(teacherId: string, lessonId: string) {
    return this.prisma.lesson.update({
      where: { id: lessonId, teacherId },
      data: { publishedAt: new Date() }
    });
  }

  gradeEssay(teacherId: string, submissionId: string, data: { finalScore: number; finalFeedback: string }) {
    return this.prisma.essaySubmission.update({
      where: { id: submissionId, assignedTeacherId: teacherId },
      data: { finalScore: data.finalScore, finalFeedback: data.finalFeedback, correctedAt: new Date() }
    });
  }
}
