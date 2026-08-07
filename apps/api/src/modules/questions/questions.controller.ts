import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { AuditAction } from "../../security/audit.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { QuestionsService } from "./questions.service";

@ApiTags("questions")
@RequirePermissions("student:access-questions")
@Controller("questions")
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get("filters")
  filters() {
    return this.questions.filters();
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: Record<string, string | undefined>) {
    return this.questions.list(user.id, query);
  }

  @Get("performance")
  performance(@CurrentUser() user: AuthUser) {
    return this.questions.performance(user.id);
  }

  @Get("history")
  history(@CurrentUser() user: AuthUser) {
    return this.questions.history(user.id);
  }

  @Get("favorites")
  favorites(@CurrentUser() user: AuthUser) {
    return this.questions.favorites(user.id);
  }

  @Get("review/errors")
  reviewErrors(@CurrentUser() user: AuthUser) {
    return this.questions.reviewErrors(user.id);
  }

  @Get("simulations")
  simulations(@CurrentUser() user: AuthUser) {
    return this.questions.simulations(user.id);
  }

  @AuditAction("questions.simulation.create")
  @Post("simulations")
  createSimulation(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title?: string;
      questionCount?: number;
      filters?: Record<string, string | undefined>;
    }
  ) {
    return this.questions.createSimulation(user.id, body);
  }

  @Get("simulations/:id")
  simulationDetail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.questions.simulationDetail(user.id, id);
  }

  @AuditAction("questions.simulation.attempt")
  @Post("simulations/:id/attempts")
  simulationAttempt(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { questionId: string; selectedAnswer?: string; discursiveAnswer?: string; timeSeconds?: number }
  ) {
    return this.questions.simulationAttempt(user.id, id, body.questionId, body);
  }

  @AuditAction("questions.simulation.submit")
  @Post("simulations/:id/submit")
  submitSimulation(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.questions.submitSimulation(user.id, id);
  }

  @Get("simulations/:id/results")
  simulationResults(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.questions.simulationResults(user.id, id);
  }

  @Get("notes")
  notes(@CurrentUser() user: AuthUser, @Query() query: { subjectId?: string; topicId?: string; q?: string }) {
    return this.questions.notes(user.id, query);
  }

  @Post("notes")
  createNote(
    @CurrentUser() user: AuthUser,
    @Body() body: { questionId?: string; subjectId?: string; topicId?: string; title: string; body: string }
  ) {
    return this.questions.createNote(user.id, body);
  }

  @Get(":id")
  detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.questions.detail(user.id, id);
  }

  @AuditAction("questions.attempt.create")
  @Post(":id/attempts")
  attempt(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { selectedAnswer?: string; discursiveAnswer?: string; timeSeconds?: number; simulationId?: string }
  ) {
    return this.questions.attempt(user.id, id, body);
  }

  @AuditAction("questions.favorite.create")
  @Post(":id/favorite")
  favorite(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.questions.favorite(user.id, id);
  }

  @AuditAction("questions.favorite.delete")
  @Delete(":id/favorite")
  unfavorite(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.questions.unfavorite(user.id, id);
  }

  @Post(":id/reactions")
  reaction(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { difficulty: "EASY" | "MEDIUM" | "HARD"; relevance: "RELEVANT" | "NOT_RELEVANT" }
  ) {
    return this.questions.reaction(user.id, id, body.difficulty, body.relevance);
  }

  @AuditAction("questions.answer.create")
  @Post(":id/answers")
  answer(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: { body: string; isOfficial?: boolean }) {
    if (body.isOfficial && !user.permissions.includes("teacher:answer-questions")) {
      throw new ForbiddenException("Somente professores podem marcar respostas oficiais.");
    }
    return this.questions.answer(user.id, id, body.body, body.isOfficial);
  }

  @Post(":id/ai-answer")
  aiAnswer(@Param("id") id: string) {
    return this.questions.aiAnswer(id);
  }
}
