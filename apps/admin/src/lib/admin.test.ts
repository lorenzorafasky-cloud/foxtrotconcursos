import { describe, expect, it } from "vitest";
import {
  buildPageParams,
  money,
  permissionKeysFromText,
  roleLabels,
  slugFrom,
  summarizePayments,
  summarizeSimulation,
  validateCourseForm,
  validateUserForm,
  type AdminDashboard,
  type SimulationRow,
  type UserRow
} from "./admin";

const user: UserRow = {
  id: "user-1",
  email: "admin@foxtrot.test",
  fullName: "Admin Foxtrot",
  nickname: "admin",
  emailVerifiedAt: "2026-08-07T00:00:00.000Z",
  twoFactorEnabled: true,
  roles: [{ role: { name: "ADMIN_MASTER" } }],
  permissions: []
};

const payments: AdminDashboard["payments"] = [
  { status: "PAID", _sum: { amountCents: 10000 }, _count: 2 },
  { status: "FAILED", _sum: { amountCents: 5000 }, _count: 1 }
];

const simulation: SimulationRow = {
  id: "simulation-1",
  title: "Simulado",
  status: "SUBMITTED",
  questionCount: 4,
  user: { id: "user-1", email: "aluno@foxtrot.test", fullName: "Aluno", nickname: "aluno" },
  questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }],
  attempts: [{ id: "a1", isCorrect: true }, { id: "a2", isCorrect: false }]
};

describe("admin frontend helpers", () => {
  it("builds paginated query params with optional filters", () => {
    const params = buildPageParams({ page: 2, limit: 50, q: " aluno ", filters: { role: "ALUNO_ILIMITADO", status: "" } });
    expect(params.toString()).toContain("page=2");
    expect(params.get("q")).toBe("aluno");
    expect(params.get("role")).toBe("ALUNO_ILIMITADO");
    expect(params.has("status")).toBe(false);
  });

  it("formats display helpers", () => {
    expect(slugFrom("Curso Fiscal 2026!")).toBe("curso-fiscal-2026");
    expect(money(12345)).toBe("R$ 123,45");
    expect(roleLabels(user)).toBe("ADMIN_MASTER");
    expect(permissionKeysFromText("a, b\na")).toEqual(["a", "b"]);
  });

  it("summarizes payments and simulations", () => {
    expect(summarizePayments(payments)).toEqual({ count: 3, amountCents: 15000, byStatus: { PAID: 2, FAILED: 1 } });
    expect(summarizeSimulation(simulation)).toEqual({ answered: 2, correct: 1, accuracy: 50, progressPercent: 50 });
  });

  it("validates sensitive forms before calling the API", () => {
    expect(validateUserForm({ email: "invalido", fullName: "", nickname: "", password: "123" }).email).toBe("Informe um e-mail valido.");
    expect(validateCourseForm({ title: "", slug: "", description: "", careerId: "", area: "" }).careerId).toBe("Escolha a carreira.");
  });
});
