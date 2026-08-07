import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuditAction } from "../../security/audit.decorator";
import { AuthUser, CurrentUser } from "../../security/auth-user.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { AiService } from "./ai.service";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @RequirePermissions("student:use-ai")
  @Get("search")
  smartSearch(@CurrentUser() user: AuthUser, @Query("q") q: string, @Query("includeAi") includeAi?: string) {
    return this.ai.smartSearch(user, q ?? "", includeAi === "true");
  }

  @RequirePermissions("student:use-ai")
  @AuditAction("ai.study-support.ask")
  @Post("study-support")
  studySupport(@CurrentUser() user: AuthUser, @Body() body: { question: string; lessonId?: string; questionId?: string }) {
    return this.ai.studySupport(user, body);
  }

  @RequirePermissions("ai:generate-materials")
  @AuditAction("ai.material.generate")
  @Post("materials")
  generateMaterial(@CurrentUser() user: AuthUser, @Body() body: { lessonId: string; kind: "SUMMARY" | "FLASHCARDS" | "QUESTIONS"; instructions?: string }) {
    return this.ai.generateMaterial(user, body);
  }

  @RequirePermissions("ai:generate-materials")
  @AuditAction("ai.lesson.organize-transcript")
  @Post("lessons/transcript")
  organizeLessonTranscript(@CurrentUser() user: AuthUser, @Body() body: { lessonId: string; transcript: string; saveAssets?: boolean }) {
    return this.ai.organizeLessonTranscript(user, body);
  }

  @RequirePermissions("ai:generate-materials")
  @AuditAction("ai.automation.create")
  @Post("automations")
  createAutomation(@CurrentUser() user: AuthUser, @Body() body: { type: "lesson.organize" | "material.summary"; input: Record<string, unknown> }) {
    return this.ai.createAutomationJob(user, body);
  }

  @RequirePermissions("ai:generate-materials")
  @Get("automations")
  jobs(@CurrentUser() user: AuthUser) {
    return this.ai.jobs(user);
  }

  @RequirePermissions("ai:review-materials")
  @Get("reviews")
  reviews(@CurrentUser() user: AuthUser) {
    return this.ai.reviews(user);
  }

  @RequirePermissions("ai:review-materials")
  @AuditAction("ai.review.update")
  @Patch("reviews/:id")
  reviewItem(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: { approved: boolean }) {
    return this.ai.reviewItem(user, id, body.approved);
  }

  @RequirePermissions("student:use-ai")
  @Get("usage")
  usage(@CurrentUser() user: AuthUser) {
    return this.ai.usage(user);
  }
}
