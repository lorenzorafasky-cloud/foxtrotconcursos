import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { CoursesService } from "../src/modules/courses/courses.service";

describe("CoursesService student flows", () => {
  it("enrolls a student when an active entitlement grants access", async () => {
    const prisma = makePrismaMock({
      entitlements: [{ type: "UNLIMITED", courseId: null, startsAt: past(), endsAt: null }]
    });
    const service = new CoursesService(prisma as never, {} as never);

    await expect(service.enroll("operacao-pf", "user-1")).resolves.toMatchObject({ ok: true });
    expect(prisma.courseEnrollment.upsert).toHaveBeenCalledWith({
      where: { userId_courseId: { userId: "user-1", courseId: "course-1" } },
      update: { updatedAt: expect.any(Date) },
      create: { userId: "user-1", courseId: "course-1" }
    });
  });

  it("blocks enrollment when the student has no course access", async () => {
    const prisma = makePrismaMock({ entitlements: [] });
    const service = new CoursesService(prisma as never, {} as never);

    await expect(service.enroll("operacao-pf", "user-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("saves progress and ensures enrollment for an allowed lesson", async () => {
    const prisma = makePrismaMock({
      entitlements: [{ type: "COURSE", courseId: "course-1", startsAt: past(), endsAt: null }]
    });
    const service = new CoursesService(prisma as never, {} as never);

    await expect(service.progress("user-1", "lesson-1", 300, true)).resolves.toMatchObject({ watchedSeconds: 300 });
    expect(prisma.courseEnrollment.upsert).toHaveBeenCalled();
    expect(prisma.lessonProgress.upsert).toHaveBeenCalledWith({
      where: { userId_lessonId: { userId: "user-1", lessonId: "lesson-1" } },
      update: { watchedSeconds: 300, completedAt: expect.any(Date) },
      create: { userId: "user-1", lessonId: "lesson-1", watchedSeconds: 300, completedAt: expect.any(Date) }
    });
  });

  it("creates an authorized material download without exposing raw storage from lesson detail", async () => {
    const prisma = makePrismaMock({
      entitlements: [{ type: "COURSE", courseId: "course-1", startsAt: past(), endsAt: null }]
    });
    const media = {
      describeStorage: vi.fn().mockReturnValue({ provider: "cloudflare-r2", bucket: "bucket", key: "slide.pdf" }),
      createMaterialDownload: vi.fn().mockReturnValue({ allowed: true, url: "https://cdn.example.com/slide.pdf" })
    };
    const service = new CoursesService(prisma as never, media as never);

    await expect(service.lesson("lesson-1", "user-1")).resolves.toMatchObject({
      allowed: true,
      lesson: {
        assets: [{ id: "asset-1", canDownload: true, storage: { provider: "cloudflare-r2" } }]
      }
    });
    await expect(service.downloadMaterial("user-1", "lesson-1", "asset-1")).resolves.toMatchObject({
      allowed: true,
      url: "https://cdn.example.com/slide.pdf"
    });
    expect(media.createMaterialDownload).toHaveBeenCalledWith(expect.objectContaining({ id: "asset-1" }));
  });

  it("blocks material download when the student has no lesson access", async () => {
    const prisma = makePrismaMock({ entitlements: [] });
    const service = new CoursesService(prisma as never, {} as never);

    await expect(service.downloadMaterial("user-1", "lesson-1", "asset-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("blocks a professor from answering doubts outside their subject scope", async () => {
    const prisma = makePrismaMock({
      entitlements: [],
      professorSubject: null
    });
    const service = new CoursesService(prisma as never, {} as never);

    await expect(
      service.answerDoubt(
        { id: "teacher-1", email: "teacher@example.com", roles: ["PROFESSOR"], permissions: ["teacher:answer-questions"] },
        "doubt-1",
        "Resposta"
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows admin to answer any lesson doubt", async () => {
    const prisma = makePrismaMock({ entitlements: [] });
    const service = new CoursesService(prisma as never, {} as never);

    await expect(
      service.answerDoubt(
        { id: "admin-1", email: "admin@example.com", roles: ["ADMIN_MASTER"], permissions: ["teacher:answer-questions"] },
        "doubt-1",
        "Resposta"
      )
    ).resolves.toMatchObject({ id: "doubt-1", answer: "Resposta" });
  });
});

function makePrismaMock({
  entitlements,
  professorSubject = { userId: "teacher-1", subjectId: "subject-1" }
}: {
  entitlements: Array<Record<string, unknown>>;
  professorSubject?: Record<string, unknown> | null;
}) {
  return {
    course: {
      findUnique: vi.fn().mockResolvedValue({
        id: "course-1",
        slug: "operacao-pf",
        publishedAt: new Date()
      })
    },
    lesson: {
      findUnique: vi.fn().mockResolvedValue({
        id: "lesson-1",
        publishedAt: new Date(),
        module: { courseId: "course-1", course: { id: "course-1", title: "Curso", slug: "curso" } },
        subject: { id: "subject-1", name: "Direito" },
        topic: null,
        teacher: null,
        assets: [
          {
            id: "asset-1",
            type: "SLIDE",
            url: "r2://bucket/slide.pdf",
            metadata: {}
          }
        ],
        doubts: [],
        progress: [],
        ratings: []
      })
    },
    entitlement: {
      findMany: vi.fn().mockResolvedValue(entitlements)
    },
    courseEnrollment: {
      upsert: vi.fn().mockResolvedValue({ id: "enrollment-1", userId: "user-1", courseId: "course-1" })
    },
    lessonProgress: {
      upsert: vi.fn(({ create }) => Promise.resolve(create))
    },
    lessonDoubt: {
      findUnique: vi.fn().mockResolvedValue({
        id: "doubt-1",
        lesson: { subjectId: "subject-1" }
      }),
      update: vi.fn(({ where, data }) => Promise.resolve({ id: where.id, ...data }))
    },
    professorSubject: {
      findUnique: vi.fn().mockResolvedValue(professorSubject)
    }
  };
}

function past() {
  return new Date(Date.now() - 60_000);
}
