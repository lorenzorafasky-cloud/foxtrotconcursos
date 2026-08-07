import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { Prisma, TaskPriority } from "@foxtrot/database";
import { PrismaService } from "../../core/prisma.service";
import { GamificationService } from "../gamification/gamification.service";

type TaskInput = {
  title: string;
  dueDate?: string;
  priority?: TaskPriority;
  recurrence?: string;
  subjectId?: string;
  topicId?: string;
  parentId?: string;
};

type GoalInput = {
  title: string;
  period: "daily" | "weekly" | "custom";
  targetNetSeconds?: number;
  targetQuestions?: number;
  targetFlashcards?: number;
  startsAt?: string;
  endsAt?: string;
};

@Injectable()
export class PlannerService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gamification?: GamificationService
  ) {}

  async dashboard(userId: string) {
    const [lists, goals, focusSessions, questionAttempts, lessonProgress, flashcards, favoriteQuestions] = await Promise.all([
      this.lists(userId),
      this.goals(userId),
      this.prisma.focusSession.findMany({ where: { userId, startedAt: { gte: daysAgo(29) } }, orderBy: { startedAt: "desc" } }),
      this.prisma.questionAttempt.findMany({ where: { userId, createdAt: { gte: daysAgo(29) } }, orderBy: { createdAt: "desc" } }),
      this.prisma.lessonProgress.findMany({
        where: { userId },
        include: { lesson: { include: { module: { include: { course: true } }, subject: true, topic: true } } },
        orderBy: { updatedAt: "desc" },
        take: 30
      }),
      this.prisma.flashcard.findMany({ where: { userId }, orderBy: { dueAt: "asc" }, take: 50 }),
      this.prisma.questionFavorite.findMany({
        where: { userId },
        include: { question: { include: { subject: true, topic: true } } },
        orderBy: { createdAt: "desc" },
        take: 20
      })
    ]);
    const tasks = (lists as PlannerList[]).flatMap((list) => list.tasks.map((task) => ({ ...task, listTitle: list.title })));
    return {
      lists,
      goals: goals.map((goal) => ({ ...goal, progress: this.goalProgress(goal, focusSessions, questionAttempts, flashcards) })),
      calendar: this.calendar(tasks),
      consistency: this.consistency(focusSessions, questionAttempts),
      progress: {
        recentLessons: lessonProgress,
        favoriteQuestions,
        dueFlashcards: flashcards.filter((card) => card.dueAt <= new Date()).length,
        favoriteFlashcards: flashcards.filter((card) => card.favorite).length
      }
    };
  }

  lists(userId: string) {
    return this.prisma.studyList.findMany({
      where: { userId },
      include: { tasks: { where: { parentId: null }, include: { subtasks: true }, orderBy: [{ dueDate: "asc" }, { title: "asc" }] } },
      orderBy: [{ isMyDay: "desc" }, { createdAt: "asc" }]
    });
  }

  createList(userId: string, title: string, isMyDay = false) {
    if (!title.trim()) throw new BadRequestException("Informe o nome da lista.");
    return this.prisma.studyList.create({ data: { userId, title: title.trim(), isMyDay } });
  }

  async createTask(userId: string, listId: string, data: TaskInput) {
    await this.assertListOwner(userId, listId);
    this.validateTask(data);
    return this.prisma.studyTask.create({
      data: {
        listId,
        title: data.title.trim(),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority ?? "NORMAL",
        recurrence: data.recurrence?.trim(),
        subjectId: data.subjectId,
        topicId: data.topicId,
        parentId: data.parentId
      }
    });
  }

  async updateTask(userId: string, id: string, data: Partial<TaskInput>) {
    await this.assertTaskOwner(userId, id);
    return this.prisma.studyTask.update({
      where: { id },
      data: {
        title: data.title?.trim(),
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
        priority: data.priority,
        recurrence: data.recurrence?.trim(),
        subjectId: data.subjectId,
        topicId: data.topicId
      }
    });
  }

  async completeTask(userId: string, id: string, completed: boolean) {
    await this.assertTaskOwner(userId, id);
    const task = await this.prisma.studyTask.update({
      where: { id },
      data: { completedAt: completed ? new Date() : null }
    });
    if (completed) {
      await this.awardXp(userId, "planner:task-complete", 5, { taskId: id }, `planner:task:${id}:complete:${userId}`);
    }
    return task;
  }

  goals(userId: string) {
    return this.prisma.studyGoal.findMany({
      where: { userId },
      orderBy: [{ completedAt: "asc" }, { startsAt: "desc" }]
    });
  }

  createGoal(userId: string, data: GoalInput) {
    this.validateGoal(data);
    return this.prisma.studyGoal.create({
      data: {
        userId,
        title: data.title.trim(),
        period: data.period,
        targetNetSeconds: Math.max(0, Math.round(data.targetNetSeconds ?? 0)),
        targetQuestions: Math.max(0, Math.round(data.targetQuestions ?? 0)),
        targetFlashcards: Math.max(0, Math.round(data.targetFlashcards ?? 0)),
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined
      }
    });
  }

  async updateGoal(userId: string, id: string, data: Partial<GoalInput> & { completed?: boolean }) {
    const goal = await this.prisma.studyGoal.findFirst({ where: { id, userId } });
    if (!goal) throw new NotFoundException("Meta nao encontrada.");
    return this.prisma.studyGoal.update({
      where: { id },
      data: {
        title: data.title?.trim(),
        period: data.period,
        targetNetSeconds: data.targetNetSeconds === undefined ? undefined : Math.max(0, Math.round(data.targetNetSeconds)),
        targetQuestions: data.targetQuestions === undefined ? undefined : Math.max(0, Math.round(data.targetQuestions)),
        targetFlashcards: data.targetFlashcards === undefined ? undefined : Math.max(0, Math.round(data.targetFlashcards)),
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        completedAt: data.completed === undefined ? undefined : data.completed ? new Date() : null
      }
    });
  }

  private async assertListOwner(userId: string, listId: string) {
    const list = await this.prisma.studyList.findFirst({ where: { id: listId, userId } });
    if (!list) throw new ForbiddenException("Lista indisponivel para este aluno.");
  }

  private async assertTaskOwner(userId: string, taskId: string) {
    const task = await this.prisma.studyTask.findFirst({ where: { id: taskId, list: { userId } } });
    if (!task) throw new ForbiddenException("Tarefa indisponivel para este aluno.");
  }

  private validateTask(data: TaskInput) {
    if (!data.title.trim()) throw new BadRequestException("Informe o titulo da tarefa.");
    if (data.priority && !Object.values(TaskPriority).includes(data.priority)) throw new BadRequestException("Prioridade invalida.");
  }

  private validateGoal(data: GoalInput) {
    if (!data.title.trim()) throw new BadRequestException("Informe o titulo da meta.");
    if (!["daily", "weekly", "custom"].includes(data.period)) throw new BadRequestException("Periodo da meta invalido.");
    const total = (data.targetNetSeconds ?? 0) + (data.targetQuestions ?? 0) + (data.targetFlashcards ?? 0);
    if (total <= 0) throw new BadRequestException("Informe pelo menos um alvo para a meta.");
  }

  private async awardXp(userId: string, source: string, points: number, metadata: Prisma.InputJsonValue, idempotencyKey: string) {
    if (this.gamification) {
      await this.gamification.awardXp(userId, source, points, metadata, idempotencyKey);
      return;
    }
    await this.prisma.xpEvent.create({ data: { userId, source, points, metadata } });
  }

  private calendar(tasks: Array<{ dueDate: Date | null; completedAt: Date | null; id: string; title: string; priority: TaskPriority; listTitle: string }>) {
    const grouped = new Map<string, Array<unknown>>();
    for (const task of tasks) {
      const key = task.dueDate ? dateKey(task.dueDate) : "sem-data";
      const current = grouped.get(key) ?? [];
      current.push(task);
      grouped.set(key, current);
    }
    return [...grouped.entries()].map(([date, items]) => ({ date, items }));
  }

  private consistency(focusSessions: Array<{ startedAt: Date; netSeconds: number }>, questionAttempts: Array<{ createdAt: Date }>) {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = daysAgo(13 - index);
      const key = dateKey(date);
      const netSeconds = focusSessions.filter((session) => dateKey(session.startedAt) === key).reduce((sum, session) => sum + session.netSeconds, 0);
      const questions = questionAttempts.filter((attempt) => dateKey(attempt.createdAt) === key).length;
      return { date: key, netSeconds, questions, active: netSeconds > 0 || questions > 0 };
    });
    return {
      days,
      streakDays: currentStreak(days),
      activeDays: days.filter((day) => day.active).length,
      weeklyNetSeconds: days.slice(-7).reduce((sum, day) => sum + day.netSeconds, 0),
      weeklyQuestions: days.slice(-7).reduce((sum, day) => sum + day.questions, 0)
    };
  }

  private goalProgress(
    goal: { startsAt: Date; endsAt: Date | null; targetNetSeconds: number; targetQuestions: number; targetFlashcards: number },
    focusSessions: Array<{ startedAt: Date; netSeconds: number }>,
    questionAttempts: Array<{ createdAt: Date }>,
    flashcards: Array<{ dueAt: Date; repetitions: number }>
  ) {
    const endsAt = goal.endsAt ?? new Date();
    const inRange = (date: Date) => date >= goal.startsAt && date <= endsAt;
    const netSeconds = focusSessions.filter((session) => inRange(session.startedAt)).reduce((sum, session) => sum + session.netSeconds, 0);
    const questions = questionAttempts.filter((attempt) => inRange(attempt.createdAt)).length;
    const reviewedFlashcards = flashcards.filter((card) => card.repetitions > 0 && inRange(card.dueAt)).length;
    const ratios = [
      ratio(netSeconds, goal.targetNetSeconds),
      ratio(questions, goal.targetQuestions),
      ratio(reviewedFlashcards, goal.targetFlashcards)
    ].filter((item) => item !== null);
    return {
      netSeconds,
      questions,
      flashcards: reviewedFlashcards,
      percent: ratios.length ? Math.min(100, Math.round(ratios.reduce((sum, item) => sum + item, 0) / ratios.length)) : 0
    };
  }
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function currentStreak(days: Array<{ active: boolean }>) {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (!days[index]?.active) break;
    streak += 1;
  }
  return streak;
}

function ratio(value: number, target: number) {
  return target > 0 ? Math.min(100, (value / target) * 100) : null;
}

type PlannerList = {
  title: string;
  tasks: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    completedAt: Date | null;
    priority: TaskPriority;
  }>;
};
