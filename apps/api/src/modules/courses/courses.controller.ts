import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { CoursesService } from "./courses.service";

@ApiTags("courses")
@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get("courses")
  list(@Query() query: { q?: string; careerId?: string; boardId?: string; status?: "PRE_EDITAL" | "POS_EDITAL" }) {
    return this.courses.list(query);
  }

  @Get("courses/:slug")
  detail(@Param("slug") slug: string, @CurrentUser() user: AuthUser) {
    return this.courses.detail(slug, user.id);
  }

  @Get("lessons/:id")
  lesson(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.courses.lesson(id, user.id);
  }

  @Get("lessons/:id/playback")
  playback(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.courses.streamPlayback(user.id, id);
  }

  @Patch("lessons/:id/progress")
  progress(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { watchedSeconds: number; completed?: boolean }
  ) {
    return this.courses.progress(user.id, id, body.watchedSeconds, body.completed);
  }

  @Post("lessons/:id/ratings")
  rate(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: { score: number; comment?: string }) {
    return this.courses.rate(user.id, id, body.score, body.comment);
  }

  @Post("lessons/:id/doubts")
  doubt(@Param("id") id: string, @CurrentUser() user: AuthUser, @Body() body: { message: string }) {
    return this.courses.createDoubt(user.id, id, body.message);
  }

  @RequirePermissions("teacher:answer-questions")
  @Post("lesson-doubts/:id/answer")
  answerDoubt(@Param("id") id: string, @Body() body: { answer: string }) {
    return this.courses.answerDoubt(id, body.answer);
  }
}
