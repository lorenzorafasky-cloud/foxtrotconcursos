import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { AdminService } from "./admin.service";
import { CreateCourseDto, ImportQuestionBatchDto } from "./admin.dto";

@ApiTags("admin")
@RequirePermissions("admin:manage-users")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("users")
  users() {
    return this.admin.users();
  }

  @RequirePermissions("admin:manage-content")
  @Post("courses")
  createCourse(@Body() body: CreateCourseDto) {
    return this.admin.createCourse(body);
  }

  @RequirePermissions("admin:manage-content")
  @Patch("courses/:id/publish")
  publishCourse(@Param("id") id: string) {
    return this.admin.publishCourse(id);
  }

  @RequirePermissions("admin:manage-content")
  @Post("questions/import")
  importQuestions(@Body() body: ImportQuestionBatchDto) {
    return this.admin.importQuestions(body.questions);
  }

  @Get("feature-flags")
  flags() {
    return this.admin.featureFlags();
  }

  @Patch("feature-flags/:key")
  setFlag(@Param("key") key: "PSYCHOLOGY" | "MENTAL_SUPPORT" | "RECREIO" | "LIVE_CLASSES", @Body() body: { enabled: boolean }) {
    return this.admin.setFeatureFlag(key, body.enabled);
  }

  @Get("audit")
  audit() {
    return this.admin.audit();
  }

  @RequirePermissions("admin:impersonate")
  @Post("impersonate/:subjectId")
  impersonate(@CurrentUser() user: AuthUser, @Param("subjectId") subjectId: string, @Body() body: { reason: string }) {
    return this.admin.impersonate(user.id, subjectId, body);
  }
}
