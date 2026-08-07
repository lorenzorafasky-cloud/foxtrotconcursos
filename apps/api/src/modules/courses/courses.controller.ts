import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { AuditAction } from "../../security/audit.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { Public } from "../../security/public.decorator";
import { CoursesService } from "./courses.service";

@ApiTags("courses")
@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Public()
  @Get("courses")
  list(@Query() query: { q?: string; careerId?: string; boardId?: string; status?: "PRE_EDITAL" | "POS_EDITAL" }) {
    return this.courses.list(query);
  }

  @RequirePermissions("student:access-courses")
  @Get("me/courses")
  myCourses(@CurrentUser() user: AuthUser) {
    return this.courses.myCourses(user.id);
  }

  @RequirePermissions("student:access-courses")
  @Get("courses/:slug")
  detail(@Param("slug") slug: string, @CurrentUser() user: AuthUser) {
    return this.courses.detail(slug, user.id);
  }

  @RequirePermissions("student:access-courses")
  @AuditAction("course.enroll")
  @Post("courses/:slug/enroll")
  enroll(@Param("slug") slug: string, @CurrentUser() user: AuthUser) {
    return this.courses.enroll(slug, user.id);
  }

  @RequirePermissions("student:access-courses")
  @Get("lessons/:id")
  lesson(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.courses.lesson(id, user.id);
  }

  @RequirePermissions("student:access-courses")
  @AuditAction("lesson.playback")
  @Get("lessons/:id/playback")
  playback(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.courses.streamPlayback(user.id, id);
  }

  @RequirePermissions("student:access-courses")
  @AuditAction("lesson.material.download")
  @Get("lessons/:id/materials/:assetId/download")
  downloadMaterial(@Param("id") id: string, @Param("assetId") assetId: string, @CurrentUser() user: AuthUser) {
    return this.courses.downloadMaterial(user.id, id, assetId);
  }

  @RequirePermissions("student:access-courses")
  @AuditAction("lesson.progress.update")
  @Patch("lessons/:id/progress")
  progress(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { watchedSeconds: number; completed?: boolean }
  ) {
    return this.courses.progress(user.id, id, body.watchedSeconds, body.completed);
  }

  @RequirePermissions("student:access-courses")
  @AuditAction("lesson.rating.upsert")
  @Post("lessons/:id/ratings")
  rate(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: { score: number; comment?: string }) {
    return this.courses.rate(user.id, id, body.score, body.comment);
  }

  @RequirePermissions("student:access-courses")
  @AuditAction("lesson.doubt.create")
  @Post("lessons/:id/doubts")
  doubt(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: { message: string }) {
    return this.courses.createDoubt(user.id, id, body.message);
  }

  @RequirePermissions("teacher:answer-questions")
  @AuditAction("lesson-doubt.answer")
  @Post("lesson-doubts/:id/answer")
  answerDoubt(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: { answer: string }) {
    return this.courses.answerDoubt(user, id, body.answer);
  }
}
