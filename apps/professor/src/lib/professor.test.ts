import { describe, expect, it } from "vitest";
import {
  formatSeconds,
  hasTeacherPermission,
  parseAlternatives,
  simulationAccuracy,
  slugFrom,
  summarizeProfessorDashboard,
  validateCoursePayload,
  validateQuestionPayload,
  type ProfessorDashboard
} from "./professor";

const dashboard: ProfessorDashboard = {
  doubts: [{ id: "doubt-1", message: "Duvida", createdAt: "2026-08-07", lesson: { id: "lesson-1", title: "Aula" }, user: { id: "user-1", nickname: "aluno", fullName: "Aluno" } }],
  essays: [
    {
      id: "essay-1",
      body: "Resposta",
      createdAt: "2026-08-07",
      student: { id: "student-1", nickname: "aluno", fullName: "Aluno" },
      question: { id: "question-1", code: "Q1", statement: "Tema", subject: { id: "subject-1", name: "Direito" } }
    }
  ],
  lessons: [
    { id: "lesson-1", moduleId: "module-1", subjectId: "subject-1", title: "Aula 1", slug: "aula-1", description: "Desc", position: 1, durationSeconds: 600, publishedAt: "2026-08-07" },
    { id: "lesson-2", moduleId: "module-1", subjectId: "subject-1", title: "Aula 2", slug: "aula-2", description: "Desc", position: 2, durationSeconds: 600 }
  ],
  courses: [
    {
      id: "course-1",
      title: "Curso",
      slug: "curso",
      description: "Desc",
      status: "PRE_EDITAL",
      area: "Fiscal",
      publishedAt: "2026-08-07",
      career: { id: "career-1", name: "Fiscal" },
      modules: []
    }
  ],
  students: [
    {
      id: "enrollment-1",
      user: { id: "student-1", fullName: "Aluno", nickname: "aluno", email: "aluno@test.local" },
      course: { id: "course-1", title: "Curso" },
      stats: { lessonCount: 4, completedLessons: 2, watchedSeconds: 1200, progressPercent: 50 }
    }
  ],
  questions: [
    {
      id: "question-1",
      code: "Q1",
      kind: "MULTIPLE_CHOICE",
      statement: "Enunciado",
      year: 2026,
      subject: { id: "subject-1", name: "Direito" },
      board: { id: "board-1", name: "Banca" },
      career: { id: "career-1", name: "Fiscal" },
      institution: { id: "institution-1", name: "Orgao" },
      position: { id: "position-1", name: "Cargo" }
    }
  ],
  simulations: [{ id: "sim-1", title: "Simulado", status: "SUBMITTED", questionCount: 2, questions: [{ id: "q1" }, { id: "q2" }], attempts: [{ id: "a1", isCorrect: true }, { id: "a2", isCorrect: false }] }]
};

describe("professor frontend helpers", () => {
  it("checks teacher permissions and admin override", () => {
    expect(hasTeacherPermission({ roles: ["PROFESSOR"], permissions: ["teacher:publish-lessons"] }, "teacher:publish-lessons")).toBe(true);
    expect(hasTeacherPermission({ roles: ["ADMIN_MASTER"], permissions: [] }, "teacher:grade-essays")).toBe(true);
    expect(hasTeacherPermission({ roles: ["PROFESSOR"], permissions: [] }, "teacher:grade-essays")).toBe(false);
  });

  it("summarizes dashboard activity", () => {
    expect(summarizeProfessorDashboard(dashboard)).toEqual({
      courses: 1,
      publishedCourses: 1,
      lessons: 2,
      publishedLessons: 1,
      pendingDoubts: 1,
      pendingEssays: 1,
      completedEssayCorrections: 0,
      students: 1,
      questions: 1,
      simulations: 1,
      averageProgress: 50
    });
  });

  it("formats seconds and slugs", () => {
    expect(formatSeconds(3600)).toBe("1h");
    expect(formatSeconds(3900)).toBe("1h 5min");
    expect(slugFrom("Direito Constitucional!")).toBe("direito-constitucional");
  });

  it("parses alternatives and validates forms", () => {
    expect(parseAlternatives("A) Uma\nB) Duas")).toEqual([{ id: "A", text: "Uma" }, { id: "B", text: "Duas" }]);
    expect(validateCoursePayload({ title: "", slug: "", description: "", careerId: "", area: "" }).title).toBe("Informe o titulo.");
    expect(validateQuestionPayload({ code: "", kind: "MULTIPLE_CHOICE", statement: "", alternativesText: "A) unica", correctAnswer: "", year: "1899", boardId: "", careerId: "", subjectId: "", institutionId: "", positionId: "" }).correctAnswer).toBe("Informe o gabarito.");
  });

  it("calculates simulation accuracy", () => {
    expect(simulationAccuracy(dashboard.simulations[0]!)).toBe(50);
    expect(simulationAccuracy({ attempts: [] })).toBe(0);
  });
});
