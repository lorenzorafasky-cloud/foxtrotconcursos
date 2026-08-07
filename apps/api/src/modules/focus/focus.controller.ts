import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { FocusService } from "./focus.service";

@ApiTags("focus")
@RequirePermissions("student:use-focus")
@Controller("focus")
export class FocusController {
  constructor(private readonly focus: FocusService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthUser) {
    return this.focus.dashboard(user.id);
  }

  @Post("sessions")
  session(@CurrentUser() user: AuthUser, @Body() body: { mode: "FREE" | "POMODORO"; grossSeconds: number; netSeconds: number; taskId?: string }) {
    return this.focus.startSession(user.id, body);
  }

  @Get("leaderboard")
  leaderboard(@Query("period") period?: "daily" | "weekly" | "all") {
    return this.focus.leaderboard(period);
  }

  @Get("flashcards")
  flashcards(@CurrentUser() user: AuthUser) {
    return this.focus.flashcards(user.id);
  }

  @Post("flashcards")
  createFlashcard(@CurrentUser() user: AuthUser, @Body() body: { front: string; back: string; subjectId?: string; topicId?: string }) {
    return this.focus.createFlashcard(user.id, body);
  }

  @Post("flashcards/:id/review")
  reviewFlashcard(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: { quality: number }) {
    return this.focus.reviewFlashcard(user.id, id, body.quality);
  }

  @Get("post-its")
  postIts(@CurrentUser() user: AuthUser) {
    return this.focus.postIts(user.id);
  }

  @Post("post-its")
  createPostIt(@CurrentUser() user: AuthUser, @Body() body: { body: string; color: string; position?: unknown }) {
    return this.focus.createPostIt(user.id, body);
  }
}
