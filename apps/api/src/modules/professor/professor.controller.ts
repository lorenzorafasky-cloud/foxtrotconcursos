import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { ProfessorService } from "./professor.service";

@ApiTags("professor")
@Controller("professor")
export class ProfessorController {
  constructor(private readonly professor: ProfessorService) {}

  @RequirePermissions("teacher:answer-questions")
  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthUser) {
    return this.professor.dashboard(user.id);
  }

  @RequirePermissions("teacher:publish-lessons")
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
    return this.professor.createLesson(user.id, body);
  }

  @RequirePermissions("teacher:publish-lessons")
  @Patch("lessons/:id/publish")
  publishLesson(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.professor.publishLesson(user.id, id);
  }

  @RequirePermissions("teacher:grade-essays")
  @Patch("essays/:id/grade")
  gradeEssay(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: { finalScore: number; finalFeedback: string }) {
    return this.professor.gradeEssay(user.id, id, body);
  }
}
