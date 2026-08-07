import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { FocusMode, TaskPriority } from "@foxtrot/database";
import { describe, expect, it, vi } from "vitest";
import { FocusService } from "../src/modules/focus/focus.service";
import { PlannerService } from "../src/modules/planner/planner.service";

describe("PlannerService productivity flows", () => {
  it("blocks task creation outside the student's lists", async () => {
    const prisma = makePlannerPrisma({ listOwner: null });
    const service = new PlannerService(prisma as never);

    await expect(service.createTask("student-1", "list-1", { title: "Revisar constitucional" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("awards xp when a student completes a task", async () => {
    const prisma = makePlannerPrisma({});
    const service = new PlannerService(prisma as never);

    await expect(service.completeTask("student-1", "task-1", true)).resolves.toMatchObject({ id: "task-1", completedAt: expect.any(Date) });
    expect(prisma.studyTask.findFirst).toHaveBeenCalledWith({ where: { id: "task-1", list: { userId: "student-1" } } });
    expect(prisma.xpEvent.create).toHaveBeenCalledWith({
      data: { userId: "student-1", source: "planner:task-complete", points: 5, metadata: { taskId: "task-1" } }
    });
  });

  it("rejects goals without a measurable target", async () => {
    const prisma = makePlannerPrisma({});
    const service = new PlannerService(prisma as never);

    expect(() => service.createGoal("student-1", { title: "Semana forte", period: "weekly" })).toThrow(BadRequestException);
  });

  it("builds consistency indicators from focus and question activity", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T12:00:00.000Z"));
    const prisma = makePlannerPrisma({
      lists: [{ id: "list-1", title: "Meu dia", tasks: [{ id: "task-1", title: "Aula", dueDate: new Date("2026-08-07T09:00:00.000Z"), completedAt: null, priority: TaskPriority.HIGH }] }],
      goals: [{
        id: "goal-1",
        title: "Meta da semana",
        period: "weekly",
        startsAt: new Date("2026-08-01T00:00:00.000Z"),
        endsAt: new Date("2026-08-07T23:59:59.000Z"),
        targetNetSeconds: 1800,
        targetQuestions: 2,
        targetFlashcards: 0
      }],
      focusSessions: [{ startedAt: new Date("2026-08-07T10:00:00.000Z"), netSeconds: 900 }],
      questionAttempts: [{ createdAt: new Date("2026-08-06T10:00:00.000Z") }, { createdAt: new Date("2026-08-07T10:00:00.000Z") }]
    });
    const service = new PlannerService(prisma as never);

    await expect(service.dashboard("student-1")).resolves.toMatchObject({
      consistency: { activeDays: 2, weeklyNetSeconds: 900, weeklyQuestions: 2 },
      goals: [{ progress: { percent: 75, netSeconds: 900, questions: 2 } }],
      calendar: [{ date: "2026-08-07" }]
    });
    vi.useRealTimers();
  });
});

describe("FocusService productivity flows", () => {
  it("rejects sessions with net time greater than gross time", async () => {
    const prisma = makeFocusPrisma({});
    const service = new FocusService(prisma as never);

    await expect(service.startSession("student-1", { mode: FocusMode.POMODORO, grossSeconds: 60, netSeconds: 90 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("records a focus session and awards xp by net minutes", async () => {
    const prisma = makeFocusPrisma({});
    const service = new FocusService(prisma as never);

    await expect(service.startSession("student-1", { mode: FocusMode.FREE, grossSeconds: 610, netSeconds: 600, taskId: "task-1" })).resolves.toMatchObject({
      id: "session-1",
      netSeconds: 600
    });
    expect(prisma.studyTask.findFirst).toHaveBeenCalledWith({ where: { id: "task-1", list: { userId: "student-1" } } });
    expect(prisma.xpEvent.create).toHaveBeenCalledWith({
      data: { userId: "student-1", source: "focus:net-minutes", points: 10, metadata: { sessionId: "session-1", taskId: "task-1" } }
    });
  });

  it("clamps timer preferences to supported limits", async () => {
    const prisma = makeFocusPrisma({});
    const service = new FocusService(prisma as never);

    await service.updatePreferences("student-1", { pomodoroSeconds: 120, breakSeconds: 9_999, longBreakSeconds: 200 });
    expect(prisma.userProductivityPreference.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ pomodoroSeconds: 300, breakSeconds: 3600, longBreakSeconds: 300 }),
      create: expect.objectContaining({ pomodoroSeconds: 300, breakSeconds: 3600, longBreakSeconds: 300 })
    }));
  });

  it("toggles flashcard favorites only for the owner", async () => {
    const prisma = makeFocusPrisma({});
    const service = new FocusService(prisma as never);

    await expect(service.favoriteFlashcard("student-1", "card-1", true)).resolves.toMatchObject({ id: "card-1", favorite: true });
    expect(prisma.flashcard.update).toHaveBeenCalledWith({ where: { id: "card-1" }, data: { favorite: true } });
  });

  it("blocks flashcard favorite changes for another student", async () => {
    const prisma = makeFocusPrisma({ flashcard: null });
    const service = new FocusService(prisma as never);

    await expect(service.favoriteFlashcard("student-1", "card-1", true)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("reviews flashcards with spaced repetition and awards xp", async () => {
    const prisma = makeFocusPrisma({});
    const service = new FocusService(prisma as never);

    await expect(service.reviewFlashcard("student-1", "card-1", 5)).resolves.toMatchObject({ id: "card-1", repetitions: 1 });
    expect(prisma.flashcard.update).toHaveBeenCalledWith({
      where: { id: "card-1" },
      data: expect.objectContaining({ repetitions: 1, intervalDays: 1, dueAt: expect.any(Date) })
    });
    expect(prisma.xpEvent.create).toHaveBeenCalledWith({
      data: { userId: "student-1", source: "flashcard:review", points: 3, metadata: { flashcardId: "card-1" } }
    });
  });
});

function makePlannerPrisma({
  listOwner = { id: "list-1", userId: "student-1" },
  taskOwner = { id: "task-1", listId: "list-1" },
  lists = [],
  goals = [],
  focusSessions = [],
  questionAttempts = [],
  lessonProgress = [],
  flashcards = [],
  favoriteQuestions = []
}: {
  listOwner?: Record<string, unknown> | null;
  taskOwner?: Record<string, unknown> | null;
  lists?: Array<Record<string, unknown>>;
  goals?: Array<Record<string, unknown>>;
  focusSessions?: Array<Record<string, unknown>>;
  questionAttempts?: Array<Record<string, unknown>>;
  lessonProgress?: Array<Record<string, unknown>>;
  flashcards?: Array<Record<string, unknown>>;
  favoriteQuestions?: Array<Record<string, unknown>>;
}) {
  return {
    studyList: {
      findFirst: vi.fn().mockResolvedValue(listOwner),
      findMany: vi.fn().mockResolvedValue(lists),
      create: vi.fn(({ data }) => Promise.resolve({ id: "list-1", ...data }))
    },
    studyTask: {
      findFirst: vi.fn().mockResolvedValue(taskOwner),
      create: vi.fn(({ data }) => Promise.resolve({ id: "task-1", ...data })),
      update: vi.fn(({ where, data }) => Promise.resolve({ id: where.id, ...data }))
    },
    studyGoal: {
      findMany: vi.fn().mockResolvedValue(goals),
      findFirst: vi.fn().mockResolvedValue(goals[0] ?? null),
      create: vi.fn(({ data }) => Promise.resolve({ id: "goal-1", ...data })),
      update: vi.fn(({ where, data }) => Promise.resolve({ id: where.id, ...data }))
    },
    focusSession: {
      findMany: vi.fn().mockResolvedValue(focusSessions)
    },
    questionAttempt: {
      findMany: vi.fn().mockResolvedValue(questionAttempts)
    },
    lessonProgress: {
      findMany: vi.fn().mockResolvedValue(lessonProgress)
    },
    flashcard: {
      findMany: vi.fn().mockResolvedValue(flashcards)
    },
    questionFavorite: {
      findMany: vi.fn().mockResolvedValue(favoriteQuestions)
    },
    xpEvent: {
      create: vi.fn().mockResolvedValue({ id: "xp-1" })
    }
  };
}

function makeFocusPrisma({
  taskOwner = { id: "task-1", listId: "list-1" },
  flashcard = { id: "card-1", easeFactor: 2.5, intervalDays: 0, repetitions: 0, favorite: false }
}: {
  taskOwner?: Record<string, unknown> | null;
  flashcard?: Record<string, unknown> | null;
}) {
  return {
    focusSession: {
      create: vi.fn(({ data }) => Promise.resolve({ id: "session-1", ...data })),
      findMany: vi.fn().mockResolvedValue([])
    },
    studyTask: {
      findFirst: vi.fn().mockResolvedValue(taskOwner),
      findMany: vi.fn().mockResolvedValue([])
    },
    xpEvent: {
      create: vi.fn().mockResolvedValue({ id: "xp-1" }),
      aggregate: vi.fn().mockResolvedValue({ _sum: { points: 0 } }),
      groupBy: vi.fn().mockResolvedValue([])
    },
    userProductivityPreference: {
      upsert: vi.fn(({ create, update }) => Promise.resolve({ userId: create.userId, ...create, ...update }))
    },
    flashcard: {
      findFirst: vi.fn().mockResolvedValue(flashcard),
      findFirstOrThrow: vi.fn().mockResolvedValue(flashcard),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(({ data }) => Promise.resolve({ id: "card-1", ...data })),
      update: vi.fn(({ where, data }) => Promise.resolve({ id: where.id, ...flashcard, ...data }))
    },
    user: {
      findMany: vi.fn().mockResolvedValue([])
    },
    postIt: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(({ data }) => Promise.resolve({ id: "post-1", ...data }))
    }
  };
}
