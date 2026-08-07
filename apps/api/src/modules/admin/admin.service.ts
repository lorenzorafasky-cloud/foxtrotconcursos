import argon2 from "argon2";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CourseStatus,
  EntitlementType,
  FeatureFlagKey,
  PaymentStatus,
  Prisma,
  QuestionKind,
  RoleName
} from "@foxtrot/database";
import { PrismaService } from "../../core/prisma.service";
import { CreateCourseDto, ImportQuestionDto } from "./admin.dto";
import { normalizeQuestionImport } from "./question-import";

type PageQuery = { q?: string; page?: string; limit?: string };

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [users, courses, lessons, questions, simulations, coupons, pendingModeration, payments, recentAudit] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.course.count(),
      this.prisma.lesson.count(),
      this.prisma.question.count(),
      this.prisma.simulation.count(),
      this.prisma.coupon.count({ where: { active: true } }),
      this.prisma.questionAnswer.count({ where: { isOfficial: false } }),
      this.prisma.payment.groupBy({ by: ["status"], _sum: { amountCents: true }, _count: true }),
      this.audit({ limit: "8" })
    ]);
    return { users, courses, lessons, questions, simulations, coupons, pendingModeration, payments, recentAudit };
  }

  async catalog() {
    const [roles, permissions, boards, careers, subjects, institutions, positions, courses, teachers] = await Promise.all([
      this.prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } }),
      this.prisma.permission.findMany({ orderBy: { key: "asc" } }),
      this.prisma.board.findMany({ orderBy: { name: "asc" } }),
      this.prisma.career.findMany({ orderBy: { name: "asc" } }),
      this.prisma.subject.findMany({ include: { topics: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
      this.prisma.institution.findMany({ orderBy: { name: "asc" } }),
      this.prisma.position.findMany({ orderBy: { name: "asc" } }),
      this.prisma.course.findMany({ orderBy: { title: "asc" } }),
      this.prisma.user.findMany({
        where: { roles: { some: { role: { name: "PROFESSOR" } } } },
        select: { id: true, fullName: true, nickname: true, email: true },
        orderBy: { fullName: "asc" }
      })
    ]);
    return {
      roles,
      permissions,
      boards,
      careers,
      subjects,
      institutions,
      positions,
      courses,
      teachers,
      courseStatuses: Object.values(CourseStatus),
      roleNames: Object.values(RoleName),
      paymentStatuses: Object.values(PaymentStatus),
      entitlementTypes: Object.values(EntitlementType),
      questionKinds: Object.values(QuestionKind),
      featureFlags: Object.values(FeatureFlagKey)
    };
  }

  async users(query: PageQuery & { role?: RoleName }) {
    const page = this.page(query);
    const where: Prisma.UserWhereInput = {
      roles: query.role ? { some: { role: { name: query.role } } } : undefined,
      OR: query.q
        ? [
            { email: { contains: query.q, mode: "insensitive" } },
            { fullName: { contains: query.q, mode: "insensitive" } },
            { nickname: { contains: query.q, mode: "insensitive" } }
          ]
        : undefined
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          nickname: true,
          emailVerifiedAt: true,
          twoFactorEnabled: true,
          createdAt: true,
          roles: { include: { role: true } },
          permissions: { include: { permission: true } },
          entitlements: { include: { course: true }, orderBy: { startsAt: "desc" }, take: 5 }
        },
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.limit
      }),
      this.prisma.user.count({ where })
    ]);
    return this.paginated(items, total, page);
  }

  async createUser(data: { email: string; fullName: string; nickname: string; password: string; roles?: RoleName[] }) {
    if (!data.email.includes("@")) throw new BadRequestException("E-mail invalido.");
    if (!data.fullName.trim() || !data.nickname.trim()) throw new BadRequestException("Informe nome e apelido.");
    if (data.password.length < 8) throw new BadRequestException("Senha deve ter pelo menos 8 caracteres.");
    const passwordHash = await argon2.hash(data.password);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        fullName: data.fullName.trim(),
        nickname: data.nickname.trim(),
        passwordHash,
        emailVerifiedAt: new Date()
      }
    });
    if (data.roles?.length) await this.setUserRoles(user.id, data.roles);
    return this.userDetail(user.id);
  }

  async updateUser(id: string, data: { fullName?: string; nickname?: string; emailVerified?: boolean; twoFactorEnabled?: boolean }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: data.fullName?.trim(),
        nickname: data.nickname?.trim(),
        emailVerifiedAt: data.emailVerified === undefined ? undefined : data.emailVerified ? new Date() : null,
        twoFactorEnabled: data.twoFactorEnabled
      },
      select: { id: true, email: true, fullName: true, nickname: true, emailVerifiedAt: true, twoFactorEnabled: true }
    });
  }

  async setUserRoles(userId: string, roles: RoleName[]) {
    const roleRows = await this.prisma.role.findMany({ where: { name: { in: roles } } });
    await this.prisma.userRole.deleteMany({ where: { userId } });
    if (roleRows.length) {
      await this.prisma.userRole.createMany({ data: roleRows.map((role) => ({ userId, roleId: role.id })), skipDuplicates: true });
    }
    return this.userDetail(userId);
  }

  async setUserPermission(userId: string, key: string, granted: boolean) {
    const permission = await this.prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: `Permissao ${key}` }
    });
    return this.prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
      update: { granted },
      create: { userId, permissionId: permission.id, granted },
      include: { permission: true }
    });
  }

  rolesPermissions() {
    return this.prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } });
  }

  async setRolePermissions(roleName: RoleName, permissionKeys: string[]) {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException("Perfil nao encontrado.");
    const permissions = [];
    for (const key of permissionKeys) {
      permissions.push(
        await this.prisma.permission.upsert({
          where: { key },
          update: {},
          create: { key, description: `Permissao ${key}` }
        })
      );
    }
    await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissions.length) {
      await this.prisma.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
        skipDuplicates: true
      });
    }
    return this.rolesPermissions();
  }

  async courses(query: PageQuery & { status?: CourseStatus }) {
    const page = this.page(query);
    const where: Prisma.CourseWhereInput = {
      status: query.status,
      OR: query.q
        ? [
            { title: { contains: query.q, mode: "insensitive" } },
            { slug: { contains: query.q, mode: "insensitive" } },
            { area: { contains: query.q, mode: "insensitive" } }
          ]
        : undefined
    };
    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: { career: true, board: true, modules: { include: { lessons: true }, orderBy: { position: "asc" } }, enrollments: true },
        orderBy: { updatedAt: "desc" },
        skip: page.skip,
        take: page.limit
      }),
      this.prisma.course.count({ where })
    ]);
    return this.paginated(items, total, page);
  }

  async createCourse(data: CreateCourseDto) {
    this.validateCourse(data);
    return this.prisma.course.create({
      data: {
        title: data.title.trim(),
        slug: this.slug(data.slug),
        description: data.description.trim(),
        status: data.status,
        careerId: data.careerId,
        boardId: data.boardId || null,
        area: data.area.trim()
      }
    });
  }

  async updateCourse(id: string, data: Partial<CreateCourseDto> & { coverImageUrl?: string; workloadMinutes?: number }) {
    return this.prisma.course.update({
      where: { id },
      data: {
        title: data.title?.trim(),
        slug: data.slug ? this.slug(data.slug) : undefined,
        description: data.description?.trim(),
        status: data.status,
        careerId: data.careerId,
        boardId: data.boardId,
        area: data.area?.trim(),
        coverImageUrl: data.coverImageUrl?.trim(),
        workloadMinutes: data.workloadMinutes
      }
    });
  }

  async publishCourse(courseId: string) {
    return this.prisma.course.update({
      where: { id: courseId },
      data: { publishedAt: new Date() }
    });
  }

  async professors(query: PageQuery) {
    const result = await this.users({ ...query, role: "PROFESSOR" });
    return result;
  }

  async assignProfessorSubject(userId: string, subjectId: string) {
    return this.prisma.professorSubject.upsert({
      where: { userId_subjectId: { userId, subjectId } },
      update: {},
      create: { userId, subjectId },
      include: { subject: true, user: { select: { id: true, fullName: true, nickname: true } } }
    });
  }

  async removeProfessorSubject(userId: string, subjectId: string) {
    await this.prisma.professorSubject.deleteMany({ where: { userId, subjectId } });
    return { ok: true };
  }

  async enrollments(query: PageQuery & { courseId?: string; userId?: string }) {
    const page = this.page(query);
    const where: Prisma.CourseEnrollmentWhereInput = { courseId: query.courseId, userId: query.userId };
    const [items, total] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where,
        include: { user: { select: { id: true, email: true, fullName: true, nickname: true } }, course: true },
        orderBy: { updatedAt: "desc" },
        skip: page.skip,
        take: page.limit
      }),
      this.prisma.courseEnrollment.count({ where })
    ]);
    return this.paginated(items, total, page);
  }

  async grantEnrollment(data: { userId: string; courseId: string; entitlementType?: EntitlementType; endsAt?: string }) {
    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId: data.userId, courseId: data.courseId } },
      update: { updatedAt: new Date() },
      create: { userId: data.userId, courseId: data.courseId }
    });
    const entitlement = await this.prisma.entitlement.create({
      data: {
        userId: data.userId,
        courseId: data.entitlementType === "UNLIMITED" ? null : data.courseId,
        type: data.entitlementType ?? "COURSE",
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        source: "admin"
      }
    });
    return { enrollment, entitlement };
  }

  async revokeEnrollment(userId: string, courseId: string) {
    await Promise.all([
      this.prisma.courseEnrollment.deleteMany({ where: { userId, courseId } }),
      this.prisma.entitlement.deleteMany({ where: { userId, OR: [{ courseId }, { type: "UNLIMITED", source: "admin" }] } })
    ]);
    return { ok: true };
  }

  async questions(query: PageQuery & { subjectId?: string; kind?: QuestionKind }) {
    const page = this.page(query);
    const where: Prisma.QuestionWhereInput = {
      subjectId: query.subjectId,
      kind: query.kind,
      OR: query.q
        ? [
            { code: { contains: query.q, mode: "insensitive" } },
            { statement: { contains: query.q, mode: "insensitive" } },
            { sourceExam: { contains: query.q, mode: "insensitive" } }
          ]
        : undefined
    };
    const [items, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: { board: true, career: true, subject: true, topic: true, institution: true, position: true },
        orderBy: [{ year: "desc" }, { code: "asc" }],
        skip: page.skip,
        take: page.limit
      }),
      this.prisma.question.count({ where })
    ]);
    return this.paginated(items, total, page);
  }

  async updateQuestion(id: string, data: Partial<ImportQuestionDto> & { boardId?: string; careerId?: string; subjectId?: string; topicId?: string; institutionId?: string; positionId?: string }) {
    return this.prisma.question.update({
      where: { id },
      data: {
        code: data.code?.trim().toUpperCase(),
        kind: data.kind,
        statement: data.statement?.trim(),
        alternatives: data.alternatives as Prisma.InputJsonValue | undefined,
        correctAnswer: data.correctAnswer,
        year: data.year,
        boardId: data.boardId,
        careerId: data.careerId,
        subjectId: data.subjectId,
        topicId: data.topicId,
        institutionId: data.institutionId,
        positionId: data.positionId,
        sourceExam: data.sourceExam,
        explanation: data.explanation
      }
    });
  }

  async simulations(query: PageQuery & { userId?: string; status?: "IN_PROGRESS" | "SUBMITTED" }) {
    const page = this.page(query);
    const where: Prisma.SimulationWhereInput = {
      userId: query.userId,
      status: query.status,
      title: query.q ? { contains: query.q, mode: "insensitive" } : undefined
    };
    const [items, total] = await Promise.all([
      this.prisma.simulation.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, nickname: true, email: true } }, questions: true, attempts: true },
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.limit
      }),
      this.prisma.simulation.count({ where })
    ]);
    return this.paginated(items, total, page);
  }

  async payments(query: PageQuery & { status?: PaymentStatus }) {
    const page = this.page(query);
    const where: Prisma.PaymentWhereInput = {
      status: query.status,
      OR: query.q
        ? [
            { provider: { contains: query.q, mode: "insensitive" } },
            { providerPaymentId: { contains: query.q, mode: "insensitive" } },
            { user: { email: { contains: query.q, mode: "insensitive" } } }
          ]
        : undefined
    };
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { user: { select: { id: true, email: true, fullName: true, nickname: true } }, course: true },
        orderBy: { createdAt: "desc" },
        skip: page.skip,
        take: page.limit
      }),
      this.prisma.payment.count({ where })
    ]);
    return this.paginated(items, total, page);
  }

  async updatePayment(id: string, status: PaymentStatus) {
    const payment = await this.prisma.payment.update({ where: { id }, data: { status } });
    if (status === "PAID") {
      await this.prisma.entitlement.create({
        data: {
          userId: payment.userId,
          courseId: payment.courseId,
          type: payment.courseId ? "COURSE" : "UNLIMITED",
          source: "admin:payment"
        }
      });
    }
    return payment;
  }

  async coupons(query: PageQuery & { active?: string }) {
    const page = this.page(query);
    const where: Prisma.CouponWhereInput = {
      active: query.active === undefined ? undefined : query.active === "true",
      code: query.q ? { contains: query.q, mode: "insensitive" } : undefined
    };
    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({ where, orderBy: { createdAt: "desc" }, skip: page.skip, take: page.limit }),
      this.prisma.coupon.count({ where })
    ]);
    return this.paginated(items, total, page);
  }

  createCoupon(data: { code: string; description?: string; percentOff?: number; amountOffCents?: number; maxRedemptions?: number; startsAt?: string; endsAt?: string; active?: boolean }) {
    this.validateCoupon(data);
    return this.prisma.coupon.create({
      data: {
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim(),
        percentOff: data.percentOff,
        amountOffCents: data.amountOffCents,
        maxRedemptions: data.maxRedemptions,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        active: data.active ?? true
      }
    });
  }

  updateCoupon(id: string, data: { description?: string; percentOff?: number; amountOffCents?: number; maxRedemptions?: number; endsAt?: string; active?: boolean }) {
    return this.prisma.coupon.update({
      where: { id },
      data: {
        description: data.description?.trim(),
        percentOff: data.percentOff,
        amountOffCents: data.amountOffCents,
        maxRedemptions: data.maxRedemptions,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        active: data.active
      }
    });
  }

  settings() {
    return this.prisma.appSetting.findMany({ orderBy: { key: "asc" } });
  }

  setSetting(key: string, value: unknown) {
    if (!key.trim()) throw new BadRequestException("Informe a chave da configuracao.");
    return this.prisma.appSetting.upsert({
      where: { key: key.trim() },
      update: { value: value as Prisma.InputJsonValue },
      create: { key: key.trim(), value: value as Prisma.InputJsonValue }
    });
  }

  featureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  }

  setFeatureFlag(key: FeatureFlagKey, enabled: boolean) {
    return this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled },
      create: { key, enabled }
    });
  }

  async moderation(query: PageQuery) {
    const page = this.page(query);
    const [answers, doubts, cases] = await Promise.all([
      this.prisma.questionAnswer.findMany({
        where: { body: query.q ? { contains: query.q, mode: "insensitive" } : undefined },
        include: { user: { select: { id: true, email: true, nickname: true } }, question: { select: { id: true, code: true } } },
        orderBy: { createdAt: "desc" },
        take: page.limit
      }),
      this.prisma.lessonDoubt.findMany({
        where: { message: query.q ? { contains: query.q, mode: "insensitive" } : undefined },
        include: { user: { select: { id: true, email: true, nickname: true } }, lesson: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: page.limit
      }),
      this.prisma.moderationCase.findMany({ orderBy: { createdAt: "desc" }, take: page.limit })
    ]);
    return { answers, doubts, cases };
  }

  async moderate(actorId: string, data: { contentType: string; contentId: string; action: "APPROVE" | "REJECT" | "ESCALATE"; reason: string }) {
    if (!data.reason.trim()) throw new BadRequestException("Informe o motivo da moderacao.");
    return this.prisma.moderationCase.create({
      data: {
        actorId,
        contentType: data.contentType,
        contentId: data.contentId,
        action: data.action,
        reason: data.reason.trim()
      }
    });
  }

  audit(query: PageQuery & { action?: string; actorId?: string } = {}) {
    const page = this.page(query);
    return this.prisma.auditLog.findMany({
      where: {
        actorId: query.actorId,
        action: query.action ? { contains: query.action, mode: "insensitive" } : undefined
      },
      include: { actor: { select: { email: true, nickname: true } }, subject: { select: { email: true, nickname: true } } },
      orderBy: { createdAt: "desc" },
      skip: page.skip,
      take: page.limit
    });
  }

  async importQuestions(questions: ImportQuestionDto[]) {
    const results = [];
    for (const rawInput of questions) {
      const input = { ...rawInput, ...normalizeQuestionImport(rawInput) };
      const [board, career, subject, institution, position] = await Promise.all([
        this.prisma.board.upsert({ where: { name: input.board }, update: {}, create: { name: input.board } }),
        this.prisma.career.upsert({ where: { name: input.career }, update: {}, create: { name: input.career } }),
        this.prisma.subject.upsert({ where: { name: input.subject }, update: {}, create: { name: input.subject } }),
        this.prisma.institution.upsert({
          where: { name: input.institution },
          update: {},
          create: { name: input.institution }
        }),
        this.prisma.position.upsert({ where: { name: input.position }, update: {}, create: { name: input.position } })
      ]);
      const topic = input.topic
        ? await this.prisma.topic.upsert({
            where: { subjectId_name: { subjectId: subject.id, name: input.topic } },
            update: {},
            create: { subjectId: subject.id, name: input.topic }
          })
        : null;

      results.push(
        await this.prisma.question.upsert({
          where: { code: input.code },
          update: {
            kind: input.kind,
            statement: input.statement,
            alternatives: input.alternatives as Prisma.InputJsonValue,
            correctAnswer: input.correctAnswer,
            year: input.year,
            boardId: board.id,
            careerId: career.id,
            subjectId: subject.id,
            topicId: topic?.id,
            institutionId: institution.id,
            positionId: position.id,
            sourceExam: input.sourceExam,
            explanation: input.explanation
          },
          create: {
            code: input.code,
            kind: input.kind,
            statement: input.statement,
            alternatives: input.alternatives as Prisma.InputJsonValue,
            correctAnswer: input.correctAnswer,
            year: input.year,
            boardId: board.id,
            careerId: career.id,
            subjectId: subject.id,
            topicId: topic?.id,
            institutionId: institution.id,
            positionId: position.id,
            sourceExam: input.sourceExam,
            explanation: input.explanation
          }
        })
      );
    }
    return { imported: results.length, questions: results };
  }

  async impersonate(actorId: string, subjectId: string, metadata?: unknown) {
    await this.prisma.auditLog.create({
      data: { actorId, subjectId, action: "admin.impersonate", entityType: "User", entityId: subjectId, metadata: metadata as object }
    });
    return { subjectId, impersonationStartedAt: new Date().toISOString() };
  }

  private userDetail(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        nickname: true,
        emailVerifiedAt: true,
        roles: { include: { role: true } },
        permissions: { include: { permission: true } }
      }
    });
  }

  private validateCourse(data: CreateCourseDto) {
    if (!data.title.trim()) throw new BadRequestException("Informe o titulo do curso.");
    if (!data.slug.trim()) throw new BadRequestException("Informe o slug do curso.");
    if (!data.description.trim()) throw new BadRequestException("Informe a descricao do curso.");
    if (!data.area.trim()) throw new BadRequestException("Informe a area do curso.");
  }

  private validateCoupon(data: { code: string; percentOff?: number; amountOffCents?: number }) {
    if (!data.code.trim()) throw new BadRequestException("Informe o codigo do cupom.");
    if (!data.percentOff && !data.amountOffCents) throw new BadRequestException("Informe desconto percentual ou valor fixo.");
    if (data.percentOff !== undefined && (data.percentOff < 1 || data.percentOff > 100)) {
      throw new BadRequestException("Desconto percentual deve estar entre 1 e 100.");
    }
  }

  private slug(value: string) {
    const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) throw new BadRequestException("Slug invalido.");
    return slug;
  }

  private page(query: PageQuery) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
    return { page, limit, skip: (page - 1) * limit };
  }

  private paginated<T>(items: T[], total: number, page: { page: number; limit: number }) {
    return { items, total, page: page.page, limit: page.limit, pages: Math.max(Math.ceil(total / page.limit), 1) };
  }
}
