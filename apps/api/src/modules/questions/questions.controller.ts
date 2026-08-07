import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
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
  list(@Query() query: Record<string, string | undefined>) {
    return this.questions.list(query);
  }

  @Get("performance")
  performance(@CurrentUser() user: AuthUser) {
    return this.questions.performance(user.id);
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
  detail(@Param("id") id: string) {
    return this.questions.detail(id);
  }

  @Post(":id/attempts")
  attempt(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { selectedAnswer?: string; timeSeconds: number }
  ) {
    return this.questions.attempt(user.id, id, body.selectedAnswer, body.timeSeconds);
  }

  @Post(":id/reactions")
  reaction(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { difficulty: "EASY" | "MEDIUM" | "HARD"; relevance: "RELEVANT" | "NOT_RELEVANT" }
  ) {
    return this.questions.reaction(user.id, id, body.difficulty, body.relevance);
  }

  @Post(":id/answers")
  answer(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: { body: string; isOfficial?: boolean }) {
    return this.questions.answer(user.id, id, body.body, body.isOfficial);
  }

  @Post(":id/ai-answer")
  aiAnswer(@Param("id") id: string) {
    return this.questions.aiAnswer(id);
  }
}
