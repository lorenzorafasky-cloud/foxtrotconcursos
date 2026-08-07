import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { LessonAssetType, QuestionKind } from "@foxtrot/database";
import { MediaService } from "../src/modules/media/media.service";
import { ProfessorService } from "../src/modules/professor/professor.service";

const teacher = {
  id: "teacher-1",
  email: "teacher@example.com",
  roles: ["PROFESSOR"],
  permissions: ["teacher:publish-lessons", "teacher:answer-questions", "teacher:grade-essays"]
};

describe("ProfessorService", () => {
  it("blocks lesson creation outside the professor subject scope", async () => {
    const prisma = makePrismaMock({ professorSubject: null });
    const service = new ProfessorService(prisma as never, new MediaService());

    await expect(
      service.createLesson(teacher, {
        moduleId: "module-1",
        subjectId: "subject-2",
        title: "Aula",
        slug: "aula",
        description: "Descricao",
        position: 1
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates material only after validating access to the lesson subject", async () => {
    const prisma = makePrismaMock({});
    const service = new ProfessorService(prisma as never, new MediaService());

    await expect(
      service.createMaterial(teacher, {
        lessonId: "lesson-1",
        type: LessonAssetType.PDF,
        url: "r2://bucket/material.pdf",
        metadata: { downloadable: true }
      })
    ).resolves.toMatchObject({ lessonId: "lesson-1", type: LessonAssetType.PDF });
    expect(prisma.lessonAsset.create).toHaveBeenCalledWith({
      data: { lessonId: "lesson-1", type: LessonAssetType.PDF, url: "r2://bucket/material.pdf", metadata: { downloadable: true } }
    });
  });

  it("validates objective questions before creation", async () => {
    const prisma = makePrismaMock({});
    const service = new ProfessorService(prisma as never, new MediaService());

    await expect(
      service.createQuestion(teacher, {
        code: "FOX-1",
        kind: QuestionKind.MULTIPLE_CHOICE,
        statement: "Enunciado",
        year: 2026,
        boardId: "board-1",
        careerId: "career-1",
        subjectId: "subject-1",
        institutionId: "institution-1",
        positionId: "position-1"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates a professor simulation from scoped questions", async () => {
    const prisma = makePrismaMock({ questions: [{ id: "question-1" }, { id: "question-2" }] });
    const service = new ProfessorService(prisma as never, new MediaService());

    await expect(
      service.createSimulation(teacher, {
        title: "Simulado",
        questionCount: 2,
        filters: { subjectId: "subject-1", kind: QuestionKind.MULTIPLE_CHOICE }
      })
    ).resolves.toMatchObject({ title: "Simulado", questionCount: 2 });
    expect(prisma.simulation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "teacher-1",
        questions: { create: [{ questionId: "question-1", position: 1 }, { questionId: "question-2", position: 2 }] }
      })
    }));
  });

  it("grades essays inside the professor subject scope", async () => {
    const prisma = makePrismaMock({});
    const service = new ProfessorService(prisma as never, new MediaService());

    await expect(service.gradeEssay(teacher, "essay-1", { finalScore: 8.5, finalFeedback: "Boa resposta." })).resolves.toMatchObject({
      id: "essay-1",
      finalScore: 8.5,
      finalFeedback: "Boa resposta."
    });
  });
});

function makePrismaMock({
  professorSubject = { userId: "teacher-1", subjectId: "subject-1" },
  questions = [{ id: "question-1" }]
}: {
  professorSubject?: Record<string, string> | null;
  questions?: Array<{ id: string }>;
}) {
  return {
    professorSubject: {
      findUnique: vi.fn().mockResolvedValue(professorSubject),
      findMany: vi.fn().mockResolvedValue(professorSubject ? [professorSubject] : [])
    },
    topic: {
      findFirst: vi.fn().mockResolvedValue({ id: "topic-1", subjectId: "subject-1" })
    },
    lesson: {
      findUnique: vi.fn().mockResolvedValue({ id: "lesson-1", subjectId: "subject-1" }),
      create: vi.fn(({ data }) => Promise.resolve({ id: "lesson-1", ...data })),
      update: vi.fn(({ where, data }) => Promise.resolve({ id: where.id, ...data }))
    },
    lessonAsset: {
      create: vi.fn(({ data }) => Promise.resolve({ id: "asset-1", ...data }))
    },
    question: {
      create: vi.fn(({ data }) => Promise.resolve({ id: "question-1", ...data })),
      findMany: vi.fn().mockResolvedValue(questions)
    },
    simulation: {
      create: vi.fn(({ data }) => Promise.resolve({ id: "simulation-1", ...data }))
    },
    essaySubmission: {
      findUnique: vi.fn().mockResolvedValue({
        id: "essay-1",
        assignedTeacherId: null,
        question: { subjectId: "subject-1" }
      }),
      update: vi.fn(({ where, data }) => Promise.resolve({ id: where.id, ...data }))
    }
  };
}
