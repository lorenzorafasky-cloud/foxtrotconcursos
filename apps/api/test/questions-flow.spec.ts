import { describe, expect, it, vi } from "vitest";
import { QuestionKind, SimulationStatus } from "@foxtrot/database";
import { QuestionsService } from "../src/modules/questions/questions.service";

describe("QuestionsService question bank and simulations", () => {
  it("records an objective attempt and awards xp on correct answer", async () => {
    const prisma = makePrismaMock({
      question: { id: "question-1", kind: QuestionKind.MULTIPLE_CHOICE, correctAnswer: "A" }
    });
    const service = new QuestionsService(prisma as never, {} as never);

    await expect(service.attempt("user-1", "question-1", { selectedAnswer: "A", timeSeconds: 42 })).resolves.toMatchObject({
      questionId: "question-1",
      selectedAnswer: "A",
      isCorrect: true
    });
    expect(prisma.xpEvent.create).toHaveBeenCalledWith({
      data: { userId: "user-1", source: "question:correct", points: 10, metadata: { questionId: "question-1", simulationId: undefined } }
    });
  });

  it("stores discursive attempts as pending correction submissions", async () => {
    const prisma = makePrismaMock({
      question: { id: "question-1", kind: QuestionKind.DISCURSIVE, correctAnswer: null }
    });
    const service = new QuestionsService(prisma as never, {} as never);

    await expect(service.attempt("user-1", "question-1", { discursiveAnswer: "Resposta fundamentada.", timeSeconds: 120 })).resolves.toMatchObject({
      questionId: "question-1",
      isCorrect: null,
      pendingCorrection: true,
      essaySubmission: { body: "Resposta fundamentada." }
    });
    expect(prisma.essaySubmission.create).toHaveBeenCalledWith({
      data: { studentId: "user-1", questionId: "question-1", body: "Resposta fundamentada." }
    });
  });

  it("creates simulations from the current question filters", async () => {
    const prisma = makePrismaMock({
      questionFindMany: [{ id: "question-1" }, { id: "question-2" }],
      simulation: makeSimulation()
    });
    const service = new QuestionsService(prisma as never, {} as never);

    await expect(
      service.createSimulation("user-1", {
        title: "Treino constitucional",
        questionCount: 2,
        filters: { subjectId: "subject-1", answered: "unanswered" }
      })
    ).resolves.toMatchObject({ id: "simulation-1" });
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ subjectId: "subject-1", attempts: { none: { userId: "user-1" } } }),
      take: 2
    }));
    expect(prisma.simulation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        title: "Treino constitucional",
        questionCount: 2,
        questions: { create: [{ questionId: "question-1", position: 1 }, { questionId: "question-2", position: 2 }] }
      })
    });
  });

  it("returns detailed simulation results and marks review items", async () => {
    const prisma = makePrismaMock({
      simulation: makeSimulation({
        status: SimulationStatus.SUBMITTED,
        attempts: [{ id: "attempt-1", isCorrect: false, selectedAnswer: "B", timeSeconds: 20 }]
      })
    });
    const service = new QuestionsService(prisma as never, {} as never);

    await expect(service.simulationResults("user-1", "simulation-1")).resolves.toMatchObject({
      id: "simulation-1",
      answered: 1,
      correct: 0,
      accuracy: 0,
      items: [{ needsReview: true }]
    });
  });
});

function makePrismaMock({
  question = { id: "question-1", kind: QuestionKind.MULTIPLE_CHOICE, correctAnswer: "A" },
  questionFindMany = [],
  simulation = makeSimulation()
}: {
  question?: { id: string; kind: QuestionKind; correctAnswer: string | null };
  questionFindMany?: Array<{ id: string }>;
  simulation?: ReturnType<typeof makeSimulation>;
}) {
  return {
    question: {
      findUnique: vi.fn().mockResolvedValue(question),
      findMany: vi.fn().mockResolvedValue(questionFindMany)
    },
    questionAttempt: {
      create: vi.fn(({ data }) => Promise.resolve({ id: "attempt-1", createdAt: new Date(), ...data })),
      findMany: vi.fn().mockResolvedValue([])
    },
    essaySubmission: {
      create: vi.fn(({ data }) => Promise.resolve({ id: "submission-1", createdAt: new Date(), ...data })),
      findMany: vi.fn().mockResolvedValue([])
    },
    xpEvent: {
      create: vi.fn().mockResolvedValue({ id: "xp-1" })
    },
    simulation: {
      create: vi.fn().mockResolvedValue({ id: "simulation-1" }),
      findFirst: vi.fn().mockResolvedValue(simulation),
      update: vi.fn().mockResolvedValue({ id: "simulation-1" }),
      findMany: vi.fn().mockResolvedValue([])
    }
  };
}

function makeSimulation({
  status = SimulationStatus.IN_PROGRESS,
  attempts = []
}: {
  status?: SimulationStatus;
  attempts?: Array<{ id: string; isCorrect: boolean | null; selectedAnswer?: string | null; timeSeconds: number }>;
} = {}) {
  return {
    id: "simulation-1",
    userId: "user-1",
    title: "Simulado",
    status,
    questionCount: 1,
    submittedAt: status === SimulationStatus.SUBMITTED ? new Date() : null,
    questions: [
      {
        id: "simulation-question-1",
        questionId: "question-1",
        position: 1,
        question: {
          id: "question-1",
          code: "FOX-1",
          kind: QuestionKind.MULTIPLE_CHOICE,
          statement: "Enunciado",
          alternatives: [{ id: "A", text: "Opcao A" }],
          correctAnswer: "A",
          explanation: "Explicacao",
          year: 2025,
          board: { id: "board-1", name: "Banca" },
          career: { id: "career-1", name: "Carreira" },
          subject: { id: "subject-1", name: "Materia" },
          topic: null,
          institution: { id: "institution-1", name: "Instituicao" },
          position: { id: "position-1", name: "Cargo" },
          aiAnswer: null,
          attempts
        }
      }
    ]
  };
}
