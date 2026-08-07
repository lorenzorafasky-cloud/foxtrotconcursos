import { describe, expect, it } from "vitest";
import {
  getProfileRedirectPath,
  getSafeNextPath,
  isEmptyErrors,
  validateLoginForm,
  validatePassword,
  validateRegisterForm
} from "./auth";

describe("auth frontend helpers", () => {
  it("validates password strength consistently with API rules", () => {
    expect(validatePassword("senhafraca")).toBe(false);
    expect(validatePassword("12345678")).toBe(false);
    expect(validatePassword("Senha123")).toBe(true);
  });

  it("validates login with two factor challenge", () => {
    const errors = validateLoginForm({ email: "aluno@foxtrot.test", password: "Senha123", needsTwoFactor: true });
    expect(errors.twoFactorCode).toBe("Informe o codigo 2FA ou codigo de backup.");
  });

  it("validates register required fields", () => {
    const errors = validateRegisterForm({
      fullName: "A",
      nickname: "",
      email: "invalido",
      password: "abc",
      confirmPassword: "def",
      acceptedTerms: false
    });
    expect(isEmptyErrors(errors)).toBe(false);
    expect(errors.email).toBe("Informe um e-mail valido.");
  });

  it("routes users by profile", () => {
    expect(getProfileRedirectPath({ roles: ["ADMIN_MASTER"] })).toContain("3001");
    expect(getProfileRedirectPath({ roles: ["PROFESSOR"] })).toContain("3002");
    expect(getProfileRedirectPath({ roles: ["ALUNO"] })).toBe("/");
  });

  it("rejects unsafe next redirects", () => {
    expect(getSafeNextPath("/questoes")).toBe("/questoes");
    expect(getSafeNextPath("https://evil.test")).toBeNull();
    expect(getSafeNextPath("//evil.test")).toBeNull();
  });
});
