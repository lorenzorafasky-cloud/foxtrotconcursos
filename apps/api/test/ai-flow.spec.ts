import { BadRequestException, ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { LessonAssetType } from "@foxtrot/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiService } from "../src/modules/ai/ai.service";

describe("AiService secure AI flows", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: "Resposta gerada com contexto." }], usage: { input_tokens: 100, output_tokens: 50 } })
    }));
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it("performs intelligent search over real catalog entities without calling AI by default", async () => {
    const prisma = makePrismaMock();
    const service = new AiService(prisma as never);

    await expect(service.smartSearch(student(), "constitucional")).resolves.toMatchObject({
      query: "constitucional",
      results: [{ type: "course" }]
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("synthesizes search results with usage and cost logging when requested", async () => {
    const prisma = makePrismaMock();
    const service = new AiService(prisma as never);

    await expect(service.smartSearch(student(), "constitucional", true)).resolves.toMatchObject({
      answer: "Resposta gerada com contexto."
    });
    expect(prisma.aiUsageEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "student-1", feature: "search.synthesis", inputTokens: 100, outputTokens: 50, costCents: expect.any(Number) })
    });
  });

  it("blocks AI calls when the daily cost limit has been reached", async () => {
    const prisma = makePrismaMock({ usageCostToday: 999999 });
    const service = new AiService(prisma as never);

    await expect(service.studySupport(student(), { question: "Explique controle de constitucionalidade." })).rejects.toBeInstanceOf(ForbiddenException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("surfaces provider failures without creating usage records", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const prisma = makePrismaMock();
    const service = new AiService(prisma as never);

    await expect(service.studySupport(student(), { question: "Explique direitos fundamentais." })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.aiUsageEvent.create).not.toHaveBeenCalled();
  });

  it("requires authorized users for material generation", async () => {
    const prisma = makePrismaMock();
    const service = new AiService(prisma as never);

    await expect(service.generateMaterial(student(), { lessonId: "lesson-1", kind: "SUMMARY" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates review items for generated materials instead of publishing directly", async () => {
    const prisma = makePrismaMock();
    const service = new AiService(prisma as never);

    await expect(service.generateMaterial(teacher(), { lessonId: "lesson-1", kind: "SUMMARY" })).resolves.toMatchObject({
      review: { id: "review-1" }
    });
    expect(prisma.aiReviewItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "PENDING", entityType: "Lesson", entityId: "lesson-1" })
    });
  });

  it("validates transcript length before organizing lessons", async () => {
    const service = new AiService(makePrismaMock() as never);

    await expect(service.organizeLessonTranscript(teacher(), { lessonId: "lesson-1", transcript: "curta" })).rejects.toBeInstanceOf(BadRequestException);
  });
});

function makePrismaMock({ usageCostToday = 0 }: { usageCostToday?: number } = {}) {
  return {
    course: {
      findMany: vi.fn().mockResolvedValue([{ id: "course-1", title: "Direito Constitucional", slug: "constitucional", description: "Curso completo" }])
    },
    lesson: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue({
        id: "lesson-1",
        title: "Direitos fundamentais",
        description: "Aula",
        subject: { name: "Direito Constitucional" },
        topic: { name: "Direitos fundamentais" },
        assets: [{ type: LessonAssetType.TRANSCRIPT, metadata: { body: "Transcricao longa sobre direitos fundamentais e controle de constitucionalidade para gerar materiais com seguranca." } }]
      })
    },
    question: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null)
    },
    note: {
      findMany: vi.fn().mockResolvedValue([])
    },
    lessonAsset: {
      createMany: vi.fn().mockResolvedValue({ count: 2 })
    },
    aiUsageEvent: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { costCents: usageCostToday } }),
      create: vi.fn().mockResolvedValue({ id: "usage-1" }),
      findMany: vi.fn().mockResolvedValue([])
    },
    aiReviewItem: {
      create: vi.fn().mockResolvedValue({ id: "review-1" }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: "review-1" })
    },
    aiAutomationJob: {
      create: vi.fn().mockResolvedValue({ id: "job-1", userId: "teacher-1", type: "lesson.organize", input: {}, status: "PENDING" }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "job-1" }),
      findMany: vi.fn().mockResolvedValue([])
    }
  };
}

function student() {
  return { id: "student-1", permissions: ["student:use-ai"] };
}

function teacher() {
  return { id: "teacher-1", permissions: ["ai:generate-materials", "ai:review-materials"] };
}
