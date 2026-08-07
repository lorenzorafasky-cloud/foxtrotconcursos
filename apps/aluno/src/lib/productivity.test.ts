import { describe, expect, it } from "vitest";
import {
  calendarDayLabel,
  clampTimerSeconds,
  consistencyPercent,
  flashcardDueCount,
  formatDuration,
  priorityLabel,
  summarizeGoals,
  summarizeTasks,
  type Flashcard,
  type StudyGoal,
  type StudyList
} from "./productivity";

const lists: StudyList[] = [
  {
    id: "list-1",
    title: "Hoje",
    isMyDay: true,
    tasks: [
      { id: "task-1", listId: "list-1", title: "Aula", dueDate: "2026-08-07T00:00:00.000Z", priority: "HIGH" },
      { id: "task-2", listId: "list-1", title: "Questao", dueDate: "2026-08-06T00:00:00.000Z", priority: "STARRED" },
      { id: "task-3", listId: "list-1", title: "Revisao", priority: "NORMAL", completedAt: "2026-08-07T10:00:00.000Z" }
    ]
  }
];

const goals: StudyGoal[] = [
  {
    id: "goal-1",
    title: "Semana",
    period: "weekly",
    targetNetSeconds: 3600,
    targetQuestions: 40,
    targetFlashcards: 20,
    startsAt: "2026-08-07T00:00:00.000Z",
    progress: { netSeconds: 1800, questions: 10, flashcards: 10, percent: 50 }
  },
  {
    id: "goal-2",
    title: "Finalizada",
    period: "daily",
    targetNetSeconds: 600,
    targetQuestions: 5,
    targetFlashcards: 5,
    startsAt: "2026-08-07T00:00:00.000Z",
    completedAt: "2026-08-07T12:00:00.000Z",
    progress: { netSeconds: 600, questions: 5, flashcards: 5, percent: 120 }
  }
];

const flashcard = (id: string, dueAt: string): Flashcard => ({
  id,
  front: "Frente",
  back: "Verso",
  easeFactor: 2.5,
  intervalDays: 1,
  repetitions: 0,
  dueAt,
  favorite: false
});

describe("student productivity helpers", () => {
  it("formats durations for timer and summary cards", () => {
    expect(formatDuration(-5)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(7200)).toBe("2h");
  });

  it("summarizes tasks by completion, deadline and priority", () => {
    expect(summarizeTasks(lists, new Date("2026-08-07T12:00:00.000Z"))).toEqual({
      total: 3,
      completed: 1,
      open: 2,
      overdue: 1,
      dueToday: 1,
      starred: 1,
      completionPercent: 33
    });
  });

  it("summarizes goal progress without exceeding 100 percent", () => {
    expect(summarizeGoals(goals)).toEqual({
      total: 2,
      completed: 1,
      active: 1,
      averageProgress: 75
    });
  });

  it("labels calendar days and priorities", () => {
    expect(calendarDayLabel("2026-08-07T00:00:00.000Z", new Date("2026-08-07T12:00:00.000Z"))).toBe("Hoje");
    expect(calendarDayLabel("2026-08-08", new Date("2026-08-07T12:00:00.000Z"))).toBe("Amanha");
    expect(priorityLabel("STARRED")).toBe("Favorita");
  });

  it("calculates consistency, timer bounds and due flashcards", () => {
    expect(consistencyPercent({ activeDays: 3, days: [{ date: "1", netSeconds: 1, active: true }, { date: "2", netSeconds: 0, active: false }, { date: "3", netSeconds: 1, active: true }, { date: "4", netSeconds: 1, active: true }] })).toBe(75);
    expect(clampTimerSeconds(999999)).toBe(43200);
    expect(flashcardDueCount([flashcard("1", "2026-08-07T10:00:00.000Z"), flashcard("2", "2026-08-08T10:00:00.000Z")], new Date("2026-08-07T12:00:00.000Z"))).toBe(1);
  });
});
