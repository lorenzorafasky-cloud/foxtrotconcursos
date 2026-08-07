import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TaskPriority } from "@foxtrot/database";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { AuditAction } from "../../security/audit.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { PlannerService } from "./planner.service";

@ApiTags("planner")
@RequirePermissions("student:use-planner")
@Controller("planner")
export class PlannerController {
  constructor(private readonly planner: PlannerService) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: AuthUser) {
    return this.planner.dashboard(user.id);
  }

  @Get("lists")
  lists(@CurrentUser() user: AuthUser) {
    return this.planner.lists(user.id);
  }

  @AuditAction("planner.list.create")
  @Post("lists")
  createList(@CurrentUser() user: AuthUser, @Body() body: { title: string; isMyDay?: boolean }) {
    return this.planner.createList(user.id, body.title, body.isMyDay);
  }

  @AuditAction("planner.task.create")
  @Post("lists/:id/tasks")
  createTask(
    @CurrentUser() user: AuthUser,
    @Param("id") listId: string,
    @Body()
    body: {
      title: string;
      dueDate?: string;
      priority?: TaskPriority;
      recurrence?: string;
      subjectId?: string;
      topicId?: string;
      parentId?: string;
    }
  ) {
    return this.planner.createTask(user.id, listId, body);
  }

  @AuditAction("planner.task.update")
  @Patch("tasks/:id")
  updateTask(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      dueDate?: string;
      priority?: TaskPriority;
      recurrence?: string;
      subjectId?: string;
      topicId?: string;
    }
  ) {
    return this.planner.updateTask(user.id, id, body);
  }

  @AuditAction("planner.task.complete")
  @Patch("tasks/:id/complete")
  complete(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: { completed: boolean }) {
    return this.planner.completeTask(user.id, id, body.completed);
  }

  @Get("goals")
  goals(@CurrentUser() user: AuthUser) {
    return this.planner.goals(user.id);
  }

  @AuditAction("planner.goal.create")
  @Post("goals")
  createGoal(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      title: string;
      period: "daily" | "weekly" | "custom";
      targetNetSeconds?: number;
      targetQuestions?: number;
      targetFlashcards?: number;
      startsAt?: string;
      endsAt?: string;
    }
  ) {
    return this.planner.createGoal(user.id, body);
  }

  @AuditAction("planner.goal.update")
  @Patch("goals/:id")
  updateGoal(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      period?: "daily" | "weekly" | "custom";
      targetNetSeconds?: number;
      targetQuestions?: number;
      targetFlashcards?: number;
      startsAt?: string;
      endsAt?: string;
      completed?: boolean;
    }
  ) {
    return this.planner.updateGoal(user.id, id, body);
  }
}
