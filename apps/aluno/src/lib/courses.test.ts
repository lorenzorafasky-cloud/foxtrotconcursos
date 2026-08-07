import { describe, expect, it } from "vitest";
import { findNextLesson, formatMinutes, progressLabel, summarizeStudentCourses, type CourseEnrollment } from "./courses";

const enrollment = (progressPercent: number, completedLessons: number, lessonCount: number, watchedSeconds: number): CourseEnrollment => ({
  id: `enrollment-${progressPercent}`,
  courseId: `course-${progressPercent}`,
  createdAt: "2026-08-07T00:00:00.000Z",
  course: {
    id: `course-${progressPercent}`,
    title: "Curso",
    slug: "curso",
    description: "Descricao",
    status: "PRE_EDITAL",
    area: "Fiscal",
    workloadMinutes: 120,
    career: { id: "career", name: "Fiscal" },
    board: null,
    modules: [],
    stats: {
      moduleCount: 1,
      lessonCount,
      workloadSeconds: 7200,
      completedLessons,
      watchedSeconds,
      progressPercent
    }
  }
});

describe("student course helpers", () => {
  it("summarizes enrollments progress", () => {
    expect(summarizeStudentCourses([enrollment(50, 2, 4, 600), enrollment(25, 1, 4, 300)])).toEqual({
      completedLessons: 3,
      totalLessons: 8,
      watchedSeconds: 900,
      enrolledCourses: 2,
      progressPercent: 38
    });
  });

  it("formats minutes for dashboard labels", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(90)).toBe("2 min");
    expect(formatMinutes(7200)).toBe("2h");
  });

  it("finds the first lesson in module order", () => {
    const course = enrollment(0, 0, 1, 0).course;
    course.modules = [
      {
        id: "module-1",
        title: "Modulo 1",
        position: 1,
        lessons: [{ id: "lesson-1", title: "Aula 1", slug: "aula-1", description: "Intro", position: 1, durationSeconds: 600 }]
      }
    ];

    expect(findNextLesson(course)?.id).toBe("lesson-1");
  });

  it("labels progress states", () => {
    expect(progressLabel(0)).toBe("Nao iniciado");
    expect(progressLabel(30)).toBe("Em andamento");
    expect(progressLabel(100)).toBe("Concluido");
  });
});
