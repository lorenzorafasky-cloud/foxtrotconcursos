import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CourseStatus, LessonAssetType, Prisma, QuestionKind } from "@foxtrot/database";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { AuditAction } from "../../security/audit.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { RequireRoles } from "../../security/roles.decorator";
import { ProfessorService } from "./professor.service";

@ApiTags("professor")
@RequireRoles("PROFESSOR", "ADMIN_MASTER")
@Controller("professor")
export class ProfessorController {
  constructor(private readonly professor: ProfessorService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthUser) {
    return this.professor.dashboard(user);
  }

  @Get("catalog")
  catalog(@CurrentUser() user: AuthUser) {
    return this.professor.catalog(user);
  }

  @RequirePermissions("teacher:publish-lessons")
  @AuditAction("professor.course.create")
  @Post("courses")
  createCourse(
    @Body()
    body: {
      title: string;
      slug: string;
      description: string;
      status: CourseStatus;
      careerId: string;
      boardId?: string;
      area: string;
      coverImageUrl?: string;
      workloadMinutes?: number;
    }
  ) {
    return this.professor.createCourse(body);
  }

  @RequirePermissions("teacher:publish-lessons")
  @AuditAction("professor.course.update")
  @Patch("courses/:id")
  updateCourse(@Param("id") id: string, @Body() body: Partial<Parameters<ProfessorService["updateCourse"]>[1]>) {
    return this.professor.updateCourse(id, body);
  }

  @RequirePermissions("teacher:publish-lessons")
  @AuditAction("professor.course.publish")
  @Patch("courses/:id/publish")
  publishCourse(@Param("id") id: string) {
    return this.professor.publishCourse(id);
  }

  @RequirePermissions("teacher:publish-lessons")
  @AuditAction("professor.module.create")
  @Post("modules")
  createModule(@Body() body: { courseId: string; title: string; position: number }) {
    return this.professor.createModule(body);
  }

  @RequirePermissions("teacher:publish-lessons")
  @AuditAction("professor.module.update")
  @Patch("modules/:id")
  updateModule(@Param("id") id: string, @Body() body: { title?: string; position?: number }) {
    return this.professor.updateModule(id, body);
  }

  @RequirePermissions("teacher:publish-lessons")
  @AuditAction("professor.lesson.create")
  @Post("lessons")
  createLesson(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
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
    return this.professor.createLesson(user, body);
  }

  @RequirePermissions("teacher:publish-lessons")
  @AuditAction("professor.lesson.update")
  @Patch("lessons/:id")
  updateLesson(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      moduleId?: string;
      subjectId?: string;
      topicId?: string;
      title?: string;
      slug?: string;
      description?: string;
      position?: number;
      streamVideoUid?: string;
      durationSeconds?: number;
    }
  ) {
    return this.professor.updateLesson(user, id, body);
  }

  @RequirePermissions("teacher:publish-lessons")
  @AuditAction("professor.lesson.publish")
  @Patch("lessons/:id/publish")
  publishLesson(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.professor.publishLesson(user, id);
  }

  @RequirePermissions("teacher:publish-lessons")
  @AuditAction("professor.lesson.video-upload")
  @Post("lessons/:id/video-upload")
  createVideoUpload(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.professor.createVideoUpload(user, id);
  }

  @RequirePermissions("teacher:publish-lessons")
  @AuditAction("professor.material.create")
  @Post("materials")
  createMaterial(
    @CurrentUser() user: AuthUser,
    @Body() body: { lessonId: string; type: LessonAssetType; url: string; metadata?: Prisma.InputJsonValue }
  ) {
    return this.professor.createMaterial(user, body);
  }

  @RequirePermissions("teacher:publish-lessons")
  @Get("students")
  students(@CurrentUser() user: AuthUser, @Query("courseId") courseId?: string) {
    return this.professor.students(user, courseId);
  }

  @RequirePermissions("teacher:answer-questions")
  @AuditAction("professor.question.create")
  @Post("questions")
  createQuestion(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
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
    }
  ) {
    return this.professor.createQuestion(user, body);
  }

  @RequirePermissions("teacher:answer-questions")
  @AuditAction("professor.simulation.create")
  @Post("simulations")
  createSimulation(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
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
    }
  ) {
    return this.professor.createSimulation(user, body);
  }

  @RequirePermissions("teacher:grade-essays")
  @Get("essays")
  essays(@CurrentUser() user: AuthUser) {
    return this.professor.essays(user);
  }

  @RequirePermissions("teacher:grade-essays")
  @AuditAction("professor.essay.grade")
  @Patch("essays/:id/grade")
  gradeEssay(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: { finalScore: number; finalFeedback: string }) {
    return this.professor.gradeEssay(user, id, body);
  }
}
