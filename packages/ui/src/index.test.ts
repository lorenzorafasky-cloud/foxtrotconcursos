import { describe, expect, it, vi } from "vitest";
import { canAccessProfile, createApiUrl, createFrontendApiClient, getInitials, readApiError } from "./index";

describe("@foxtrot/ui frontend foundation", () => {
  it("normalizes API URLs", () => {
    expect(createApiUrl("http://localhost:3333/", "/auth/me")).toBe("http://localhost:3333/auth/me");
    expect(createApiUrl("http://localhost:3333", "courses")).toBe("http://localhost:3333/courses");
  });

  it("checks access by roles and permissions", () => {
    const user = { roles: ["PROFESSOR"], permissions: ["courses:write"] };

    expect(canAccessProfile(user, { roles: ["PROFESSOR"] })).toBe(true);
    expect(canAccessProfile(user, { permissions: ["courses:write"] })).toBe(true);
    expect(canAccessProfile(user, { roles: ["ADMIN_MASTER"] })).toBe(false);
    expect(canAccessProfile(null, { roles: ["ALUNO"] })).toBe(false);
  });

  it("creates stable initials for identity surfaces", () => {
    expect(getInitials("Ana Maria Silva")).toBe("AM");
    expect(getInitials("")).toBe("FX");
  });

  it("reads API validation messages safely", async () => {
    const response = new Response(JSON.stringify({ message: ["Email invalido", "Senha obrigatoria"] }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });

    await expect(readApiError(response)).resolves.toBe("Email invalido Senha obrigatoria");
  });

  it("configures credentialed API requests", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const apiRequest = createFrontendApiClient("http://localhost:3333");
    await expect(apiRequest<{ ok: boolean }>("/health")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3333/health", expect.objectContaining({ credentials: "include" }));
    vi.unstubAllGlobals();
  });
});
