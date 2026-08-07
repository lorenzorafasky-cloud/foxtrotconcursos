import { describe, expect, it } from "vitest";
import {
  attemptResultLabel,
  parseAlternatives,
  shouldShowQuestionSolution,
  summarizeAttempts,
  summarizeSimulation,
  type AttemptHistory
} from "./questions";

const historyItem = (isCorrect: boolean | null): AttemptHistory => ({
  id: `attempt-${String(isCorrect)}`,
  isCorrect,
  selectedAnswer: "A",
  timeSeconds: 30,
  createdAt: "2026-08-07T00:00:00.000Z",
  question: {
    id: "question",
    code: "Q001",
    kind: "MULTIPLE_CHOICE",
    statement: "Enunciado",
    alternatives: [],
    correctAnswer: "A",
    explanation: "Explicacao",
    year: 2026,
    board: { id: "board", name: "Banca" },
    career: { id: "career", name: "Carreira" },
    subject: { id: "subject", name: "Materia" },
    institution: { id: "institution", name: "Instituicao" },
    position: { id: "position", name: "Cargo" }
  }
});

describe("question frontend helpers", () => {
  it("parses valid alternatives and ignores malformed items", () => {
    expect(parseAlternatives([{ id: "A", text: "Texto" }, null, { id: "B" }])).toEqual([{ id: "A", text: "Texto" }]);
  });

  it("summarizes attempt history", () => {
    expect(summarizeAttempts([historyItem(true), historyItem(false), historyItem(null)])).toEqual({
      attempts: 3,
      correct: 1,
      incorrect: 1,
      pending: 1,
      accuracy: 50
    });
  });

  it("summarizes simulation progress and accuracy", () => {
    expect(summarizeSimulation({ questionCount: 10, attempts: [{ id: "1", isCorrect: true }, { id: "2", isCorrect: false }] })).toEqual({
      answered: 2,
      correct: 1,
      pending: 0,
      accuracy: 50,
      progressPercent: 20
    });
  });

  it("labels attempt result states", () => {
    expect(attemptResultLabel(true)).toBe("Correta");
    expect(attemptResultLabel(false)).toBe("Errada");
    expect(attemptResultLabel(null)).toBe("Pendente");
  });

  it("shows solution only after attempts or when explanation exists", () => {
    expect(shouldShowQuestionSolution({ attempts: [], explanation: null })).toBe(false);
    expect(shouldShowQuestionSolution({ attempts: [{ id: "a", createdAt: "" }], explanation: null })).toBe(true);
  });
});
