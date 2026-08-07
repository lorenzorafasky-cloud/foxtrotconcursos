import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { PlannerService } from "./planner.service";

@ApiTags("planner")
@RequirePermissions("student:use-planner")
@Controller("planner")
export class PlannerController {
  constructor(private readonly planner: PlannerService) {}

  @Get("lists")
  lists(@CurrentUser() user: AuthUser) {
    return this.planner.lists(user.id);
  }

  @Post("lists")
  createList(@CurrentUser() user: AuthUser, @Body() body: { title: string }) {
    return this.planner.createList(user.id, body.title);
  }

  @Post("lists/:id/tasks")
  createTask(@Param("id") listId: string, @Body() body: Parameters<PlannerService["createTask"]>[1]) {
    return this.planner.createTask(listId, body);
  }

  @Patch("tasks/:id/complete")
  complete(@Param("id") id: string, @Body() body: { completed: boolean }) {
    return this.planner.completeTask(id, body.completed);
  }
}
