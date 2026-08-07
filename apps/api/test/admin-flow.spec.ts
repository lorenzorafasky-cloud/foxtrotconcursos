import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AdminService } from "../src/modules/admin/admin.service";

describe("AdminService operational flows", () => {
  it("creates a user and attaches the requested role", async () => {
    const prisma = makePrismaMock();
    const service = new AdminService(prisma as never);

    await expect(
      service.createUser({
        email: "novo@example.com",
        fullName: "Novo Aluno",
        nickname: "novo",
        password: "Foxtrot@123",
        roles: ["ALUNO_ILIMITADO"]
      })
    ).resolves.toMatchObject({ id: "user-1" });
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: "novo@example.com" }) });
    expect(prisma.userRole.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-1", roleId: "role-1" }],
      skipDuplicates: true
    });
  });

  it("replaces role permissions with normalized permission rows", async () => {
    const prisma = makePrismaMock();
    const service = new AdminService(prisma as never);

    await expect(service.setRolePermissions("PROFESSOR", ["teacher:publish-lessons", "teacher:grade-essays"])).resolves.toEqual([
      { id: "role-1", name: "ALUNO_ILIMITADO" }
    ]);
    expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: "role-1" } });
    expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
      data: [{ roleId: "role-1", permissionId: "permission-1" }, { roleId: "role-1", permissionId: "permission-1" }],
      skipDuplicates: true
    });
  });

  it("grants enrollment and entitlement together", async () => {
    const prisma = makePrismaMock();
    const service = new AdminService(prisma as never);

    await expect(service.grantEnrollment({ userId: "user-1", courseId: "course-1", entitlementType: "COURSE" })).resolves.toMatchObject({
      enrollment: { userId: "user-1", courseId: "course-1" },
      entitlement: { source: "admin" }
    });
  });

  it("validates coupon discounts before creation", async () => {
    const prisma = makePrismaMock();
    const service = new AdminService(prisma as never);

    expect(() => service.createCoupon({ code: "SEM-DESCONTO" })).toThrow(BadRequestException);
  });

  it("records moderation actions with actor, target and reason", async () => {
    const prisma = makePrismaMock();
    const service = new AdminService(prisma as never);

    await expect(
      service.moderate("admin-1", {
        contentType: "QuestionAnswer",
        contentId: "answer-1",
        action: "REJECT",
        reason: "Conteudo inadequado"
      })
    ).resolves.toMatchObject({ action: "REJECT", reason: "Conteudo inadequado" });
  });
});

function makePrismaMock() {
  return {
    user: {
      create: vi.fn().mockResolvedValue({ id: "user-1" }),
      findUnique: vi.fn().mockResolvedValue({ id: "user-1" })
    },
    role: {
      findMany: vi.fn().mockResolvedValue([{ id: "role-1", name: "ALUNO_ILIMITADO" }]),
      findUnique: vi.fn().mockResolvedValue({ id: "role-1", name: "PROFESSOR" })
    },
    userRole: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    permission: {
      upsert: vi.fn().mockResolvedValue({ id: "permission-1", key: "teacher:publish-lessons" })
    },
    rolePermission: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 2 })
    },
    courseEnrollment: {
      upsert: vi.fn(({ create }) => Promise.resolve({ id: "enrollment-1", ...create }))
    },
    entitlement: {
      create: vi.fn(({ data }) => Promise.resolve({ id: "entitlement-1", ...data }))
    },
    coupon: {
      create: vi.fn(({ data }) => Promise.resolve({ id: "coupon-1", ...data }))
    },
    moderationCase: {
      create: vi.fn(({ data }) => Promise.resolve({ id: "moderation-1", ...data }))
    }
  };
}
