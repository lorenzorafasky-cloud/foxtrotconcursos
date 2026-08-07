import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it, vi } from "vitest";
import { AuthUser } from "../src/security/auth-user.decorator";
import { JwtAuthGuard } from "../src/security/jwt-auth.guard";
import { PERMISSIONS_KEY } from "../src/security/permissions.decorator";
import { IS_PUBLIC_KEY } from "../src/security/public.decorator";
import { ROLES_KEY } from "../src/security/roles.decorator";

describe("JwtAuthGuard", () => {
  const payload: AuthUser = {
    id: "user-1",
    email: "user@example.com",
    roles: ["PROFESSOR"],
    permissions: ["teacher:publish-lessons"]
  };

  it("skips token validation for public handlers", async () => {
    const jwt = { verifyAsync: vi.fn() } as unknown as JwtService;
    const guard = new JwtAuthGuard(makeReflector({ [IS_PUBLIC_KEY]: true }), jwt);

    await expect(guard.canActivate(makeContext({ headers: {} }))).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it("rejects requests without a token", async () => {
    const guard = new JwtAuthGuard(makeReflector({}), { verifyAsync: vi.fn() } as unknown as JwtService);

    await expect(guard.canActivate(makeContext({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects authenticated users without required role", async () => {
    const guard = new JwtAuthGuard(
      makeReflector({ [ROLES_KEY]: ["ADMIN_MASTER"] }),
      { verifyAsync: vi.fn().mockResolvedValue(payload) } as unknown as JwtService
    );

    await expect(guard.canActivate(makeContext(authRequest()))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects authenticated users without required permissions", async () => {
    const guard = new JwtAuthGuard(
      makeReflector({ [PERMISSIONS_KEY]: ["admin:manage-users"] }),
      { verifyAsync: vi.fn().mockResolvedValue(payload) } as unknown as JwtService
    );

    await expect(guard.canActivate(makeContext(authRequest()))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("sets the authenticated user when roles and permissions match", async () => {
    const request = authRequest();
    const guard = new JwtAuthGuard(
      makeReflector({ [ROLES_KEY]: ["PROFESSOR"], [PERMISSIONS_KEY]: ["teacher:publish-lessons"] }),
      { verifyAsync: vi.fn().mockResolvedValue(payload) } as unknown as JwtService
    );

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });
});

function authRequest() {
  return {
    headers: { authorization: "Bearer signed-token" },
    cookies: {}
  } as { headers: Record<string, string>; cookies: Record<string, string>; user?: AuthUser };
}

function makeReflector(metadata: Record<string, unknown>) {
  return {
    getAllAndOverride: (key: string) => metadata[key]
  } as unknown as Reflector;
}

function makeContext(request: unknown) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;
}
