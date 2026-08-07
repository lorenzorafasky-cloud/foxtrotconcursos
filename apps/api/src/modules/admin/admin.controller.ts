import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CourseStatus, EntitlementType, FeatureFlagKey, PaymentStatus, Prisma, QuestionKind, RoleName } from "@foxtrot/database";
import { CurrentUser, AuthUser } from "../../security/auth-user.decorator";
import { AuditAction } from "../../security/audit.decorator";
import { RequirePermissions } from "../../security/permissions.decorator";
import { RequireRoles } from "../../security/roles.decorator";
import { AdminService } from "./admin.service";
import { CreateCourseDto, ImportQuestionBatchDto, ImportQuestionDto } from "./admin.dto";

@ApiTags("admin")
@RequireRoles("ADMIN_MASTER")
@RequirePermissions("admin:manage-users")
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("catalog")
  catalog() {
    return this.admin.catalog();
  }

  @Get("users")
  users(@Query() query: { q?: string; page?: string; limit?: string; role?: RoleName }) {
    return this.admin.users(query);
  }

  @AuditAction("admin.user.create")
  @Post("users")
  createUser(@Body() body: { email: string; fullName: string; nickname: string; password: string; roles?: RoleName[] }) {
    return this.admin.createUser(body);
  }

  @AuditAction("admin.user.update")
  @Patch("users/:id")
  updateUser(@Param("id") id: string, @Body() body: { fullName?: string; nickname?: string; emailVerified?: boolean; twoFactorEnabled?: boolean }) {
    return this.admin.updateUser(id, body);
  }

  @AuditAction("admin.user.roles.set")
  @Patch("users/:id/roles")
  setUserRoles(@Param("id") id: string, @Body() body: { roles: RoleName[]; confirm: boolean }) {
    this.ensureConfirmed(body.confirm);
    return this.admin.setUserRoles(id, body.roles);
  }

  @AuditAction("admin.user.permission.set")
  @Patch("users/:id/permissions/:key")
  setUserPermission(@Param("id") id: string, @Param("key") key: string, @Body() body: { granted: boolean }) {
    return this.admin.setUserPermission(id, key, body.granted);
  }

  @Get("roles")
  roles() {
    return this.admin.rolesPermissions();
  }

  @AuditAction("admin.role.permissions.set")
  @Patch("roles/:name/permissions")
  setRolePermissions(@Param("name") name: RoleName, @Body() body: { permissionKeys: string[]; confirm: boolean }) {
    this.ensureConfirmed(body.confirm);
    return this.admin.setRolePermissions(name, body.permissionKeys);
  }

  @RequirePermissions("admin:manage-content")
  @Get("courses")
  courses(@Query() query: { q?: string; page?: string; limit?: string; status?: CourseStatus }) {
    return this.admin.courses(query);
  }

  @RequirePermissions("admin:manage-content")
  @AuditAction("admin.course.create")
  @Post("courses")
  createCourse(@Body() body: CreateCourseDto) {
    return this.admin.createCourse(body);
  }

  @RequirePermissions("admin:manage-content")
  @AuditAction("admin.course.update")
  @Patch("courses/:id")
  updateCourse(@Param("id") id: string, @Body() body: Partial<CreateCourseDto> & { coverImageUrl?: string; workloadMinutes?: number }) {
    return this.admin.updateCourse(id, body);
  }

  @RequirePermissions("admin:manage-content")
  @AuditAction("admin.course.publish")
  @Patch("courses/:id/publish")
  publishCourse(@Param("id") id: string) {
    return this.admin.publishCourse(id);
  }

  @Get("professors")
  professors(@Query() query: { q?: string; page?: string; limit?: string }) {
    return this.admin.professors(query);
  }

  @AuditAction("admin.professor.subject.assign")
  @Post("professors/:userId/subjects")
  assignProfessorSubject(@Param("userId") userId: string, @Body() body: { subjectId: string }) {
    return this.admin.assignProfessorSubject(userId, body.subjectId);
  }

  @AuditAction("admin.professor.subject.remove")
  @Delete("professors/:userId/subjects/:subjectId")
  removeProfessorSubject(@Param("userId") userId: string, @Param("subjectId") subjectId: string) {
    return this.admin.removeProfessorSubject(userId, subjectId);
  }

  @Get("enrollments")
  enrollments(@Query() query: { q?: string; page?: string; limit?: string; courseId?: string; userId?: string }) {
    return this.admin.enrollments(query);
  }

  @AuditAction("admin.enrollment.grant")
  @Post("enrollments")
  grantEnrollment(@Body() body: { userId: string; courseId: string; entitlementType?: EntitlementType; endsAt?: string; confirm: boolean }) {
    this.ensureConfirmed(body.confirm);
    return this.admin.grantEnrollment(body);
  }

  @AuditAction("admin.enrollment.revoke")
  @Delete("enrollments/:userId/:courseId")
  revokeEnrollment(@Param("userId") userId: string, @Param("courseId") courseId: string) {
    return this.admin.revokeEnrollment(userId, courseId);
  }

  @RequirePermissions("admin:manage-content")
  @Get("questions")
  questions(@Query() query: { q?: string; page?: string; limit?: string; subjectId?: string; kind?: QuestionKind }) {
    return this.admin.questions(query);
  }

  @RequirePermissions("admin:manage-content")
  @AuditAction("admin.question.update")
  @Patch("questions/:id")
  updateQuestion(@Param("id") id: string, @Body() body: Partial<ImportQuestionDto> & { boardId?: string; careerId?: string; subjectId?: string; topicId?: string; institutionId?: string; positionId?: string }) {
    return this.admin.updateQuestion(id, body);
  }

  @RequirePermissions("admin:manage-content")
  @AuditAction("admin.questions.import")
  @Post("questions/import")
  importQuestions(@Body() body: ImportQuestionBatchDto) {
    return this.admin.importQuestions(body.questions);
  }

  @Get("simulations")
  simulations(@Query() query: { q?: string; page?: string; limit?: string; userId?: string; status?: "IN_PROGRESS" | "SUBMITTED" }) {
    return this.admin.simulations(query);
  }

  @RequirePermissions("admin:manage-payments")
  @Get("payments")
  payments(@Query() query: { q?: string; page?: string; limit?: string; status?: PaymentStatus }) {
    return this.admin.payments(query);
  }

  @RequirePermissions("admin:manage-payments")
  @AuditAction("admin.payment.status.update")
  @Patch("payments/:id/status")
  updatePayment(@Param("id") id: string, @Body() body: { status: PaymentStatus; confirm: boolean }) {
    this.ensureConfirmed(body.confirm);
    return this.admin.updatePayment(id, body.status);
  }

  @RequirePermissions("admin:manage-payments")
  @Get("coupons")
  coupons(@Query() query: { q?: string; page?: string; limit?: string; active?: string }) {
    return this.admin.coupons(query);
  }

  @RequirePermissions("admin:manage-payments")
  @AuditAction("admin.coupon.create")
  @Post("coupons")
  createCoupon(@Body() body: { code: string; description?: string; percentOff?: number; amountOffCents?: number; maxRedemptions?: number; startsAt?: string; endsAt?: string; active?: boolean }) {
    return this.admin.createCoupon(body);
  }

  @RequirePermissions("admin:manage-payments")
  @AuditAction("admin.coupon.update")
  @Patch("coupons/:id")
  updateCoupon(@Param("id") id: string, @Body() body: { description?: string; percentOff?: number; amountOffCents?: number; maxRedemptions?: number; endsAt?: string; active?: boolean }) {
    return this.admin.updateCoupon(id, body);
  }

  @Get("settings")
  settings() {
    return this.admin.settings();
  }

  @AuditAction("admin.setting.update")
  @Patch("settings/:key")
  setSetting(@Param("key") key: string, @Body() body: { value: unknown; confirm: boolean }) {
    this.ensureConfirmed(body.confirm);
    return this.admin.setSetting(key, body.value);
  }

  @Get("feature-flags")
  flags() {
    return this.admin.featureFlags();
  }

  @AuditAction("admin.feature-flag.update")
  @Patch("feature-flags/:key")
  setFlag(@Param("key") key: FeatureFlagKey, @Body() body: { enabled: boolean }) {
    return this.admin.setFeatureFlag(key, body.enabled);
  }

  @Get("moderation")
  moderation(@Query() query: { q?: string; page?: string; limit?: string }) {
    return this.admin.moderation(query);
  }

  @AuditAction("admin.moderation.action")
  @Post("moderation")
  moderate(
    @CurrentUser() user: AuthUser,
    @Body() body: { contentType: string; contentId: string; action: "APPROVE" | "REJECT" | "ESCALATE"; reason: string; confirm: boolean }
  ) {
    this.ensureConfirmed(body.confirm);
    return this.admin.moderate(user.id, body);
  }

  @Get("audit")
  audit(@Query() query: { q?: string; page?: string; limit?: string; action?: string; actorId?: string }) {
    return this.admin.audit(query);
  }

  @RequirePermissions("admin:impersonate")
  @AuditAction("admin.impersonate")
  @Post("impersonate/:subjectId")
  impersonate(@CurrentUser() user: AuthUser, @Param("subjectId") subjectId: string, @Body() body: { reason: string }) {
    return this.admin.impersonate(user.id, subjectId, body);
  }

  private ensureConfirmed(confirm: boolean) {
    if (!confirm) throw new BadRequestException("Confirmacao obrigatoria para esta acao sensivel.");
  }
}
