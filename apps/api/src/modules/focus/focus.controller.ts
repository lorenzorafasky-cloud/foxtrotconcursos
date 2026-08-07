import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { FocusMode, Prisma } from "@foxtrot/database";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { AuditAction } from "../../security/audit.decorator";
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

  @AuditAction("focus.session.create")
  @Post("sessions")
  session(
    @CurrentUser() user: AuthUser,
    @Body() body: { mode: FocusMode; grossSeconds: number; netSeconds: number; taskId?: string; startedAt?: string }
  ) {
    return this.focus.startSession(user.id, body);
  }

  @Get("preferences")
  preferences(@CurrentUser() user: AuthUser) {
    return this.focus.preferences(user.id);
  }

  @AuditAction("focus.preferences.update")
  @Patch("preferences")
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      focusMode?: FocusMode;
      pomodoroSeconds?: number;
      breakSeconds?: number;
      longBreakSeconds?: number;
      autoStartBreaks?: boolean;
      soundSettings?: Prisma.InputJsonValue;
    }
  ) {
    return this.focus.updatePreferences(user.id, body);
  }

  @Get("leaderboard")
  leaderboard(@Query("period") period?: "daily" | "weekly" | "all") {
    return this.focus.leaderboard(period);
  }

  @Get("flashcards")
  flashcards(@CurrentUser() user: AuthUser, @Query("filter") filter?: "due" | "favorites" | "all") {
    return this.focus.flashcards(user.id, filter ?? "all");
  }

  @AuditAction("focus.flashcard.create")
  @Post("flashcards")
  createFlashcard(@CurrentUser() user: AuthUser, @Body() body: { front: string; back: string; subjectId?: string; topicId?: string; favorite?: boolean }) {
    return this.focus.createFlashcard(user.id, body);
  }

  @AuditAction("focus.flashcard.review")
  @Post("flashcards/:id/review")
  reviewFlashcard(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: { quality: number }) {
    return this.focus.reviewFlashcard(user.id, id, body.quality);
  }

  @AuditAction("focus.flashcard.favorite")
  @Patch("flashcards/:id/favorite")
  favoriteFlashcard(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: { favorite: boolean }) {
    return this.focus.favoriteFlashcard(user.id, id, body.favorite);
  }

  @Get("post-its")
  postIts(@CurrentUser() user: AuthUser) {
    return this.focus.postIts(user.id);
  }

  @AuditAction("focus.post-it.create")
  @Post("post-its")
  createPostIt(@CurrentUser() user: AuthUser, @Body() body: { body: string; color: string; position?: unknown }) {
    return this.focus.createPostIt(user.id, body);
  }
}
