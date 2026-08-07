import { describe, expect, it, vi } from "vitest";
import { PrivacyService } from "../src/modules/privacy/privacy.service";

describe("PrivacyService LGPD flows", () => {
  it("records consent with request context without exposing secrets", async () => {
    const prisma = makePrismaMock();
    const service = new PrivacyService(prisma as never);

    await service.recordConsent("user-1", { subject: "cookies", version: "2026-08-07", accepted: true }, {
      requestId: "req-1",
      ipAddress: "127.0.0.1",
      userAgent: "vitest"
    });

    expect(prisma.privacyConsent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        subject: "cookies",
        version: "2026-08-07",
        accepted: true,
        metadata: { requestId: "req-1" }
      })
    });
  });

  it("creates auditable data subject requests", async () => {
    const prisma = makePrismaMock();
    const service = new PrivacyService(prisma as never);

    await service.createRequest("user-1", { type: "PORTABILITY", description: "Quero meus dados." }, {
      requestId: "req-2",
      ipAddress: "127.0.0.1",
      userAgent: "vitest"
    });

    expect(prisma.dataSubjectRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        type: "PORTABILITY",
        description: "Quero meus dados."
      })
    });
  });

  it("exports account data without password hash or tokens", async () => {
    const prisma = makePrismaMock();
    const service = new PrivacyService(prisma as never);

    const exported = await service.exportMyData("user-1") as { user: Record<string, unknown> };

    expect(exported.user.email).toBe("aluno@foxtrot.test");
    expect(exported.user.passwordHash).toBeUndefined();
    expect(exported.user.twoFactorSecret).toBeUndefined();
    expect(exported).not.toHaveProperty("refreshTokens");
  });
});

function makePrismaMock() {
  return {
    privacyConsent: {
      create: vi.fn().mockResolvedValue({ id: "consent-1" }),
      findMany: vi.fn().mockResolvedValue([{ id: "consent-1", subject: "cookies" }])
    },
    dataSubjectRequest: {
      create: vi.fn().mockResolvedValue({ id: "request-1" }),
      findMany: vi.fn().mockResolvedValue([{ id: "request-1", type: "PORTABILITY", status: "OPEN" }]),
      findUnique: vi.fn().mockResolvedValue({ id: "request-1" }),
      update: vi.fn().mockResolvedValue({ id: "request-1", status: "COMPLETED" })
    },
    aiUsageEvent: {
      findMany: vi.fn().mockResolvedValue([])
    },
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "aluno@foxtrot.test",
        fullName: "Aluno Foxtrot",
        nickname: "aluno",
        avatarUrl: null,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: true,
        onboardingComplete: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        roles: [],
        permissions: []
      })
    },
    onboardingProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    courseEnrollment: { findMany: vi.fn().mockResolvedValue([]) },
    lessonProgress: { findMany: vi.fn().mockResolvedValue([]) },
    lessonRating: { findMany: vi.fn().mockResolvedValue([]) },
    questionAttempt: { findMany: vi.fn().mockResolvedValue([]) },
    questionFavorite: { findMany: vi.fn().mockResolvedValue([]) },
    simulation: { findMany: vi.fn().mockResolvedValue([]) },
    note: { findMany: vi.fn().mockResolvedValue([]) },
    studyGoal: { findMany: vi.fn().mockResolvedValue([]) },
    focusSession: { findMany: vi.fn().mockResolvedValue([]) },
    flashcard: { findMany: vi.fn().mockResolvedValue([]) },
    payment: { findMany: vi.fn().mockResolvedValue([]) },
    subscription: { findMany: vi.fn().mockResolvedValue([]) }
  };
}
