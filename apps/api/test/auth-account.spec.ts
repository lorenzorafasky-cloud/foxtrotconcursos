import argon2 from "argon2";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/modules/auth/auth.service";

describe("AuthService account flows", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.APP_URL = "http://localhost:3000";
  });

  it("requires email confirmation before issuing login tokens", async () => {
    const prisma = makePrismaMock({
      user: {
        id: "user-1",
        email: "new@example.com",
        passwordHash: await argon2.hash("Senha123"),
        emailVerifiedAt: null,
        roles: []
      }
    });
    const service = new AuthService(prisma as never, { signAsync: vi.fn() } as never, makeMailerMock() as never);

    await expect(service.login({ email: "new@example.com", password: "Senha123" })).resolves.toMatchObject({
      emailVerificationRequired: true
    });
  });

  it("confirms email with a valid verification token", async () => {
    const user = {
      id: "user-1",
      email: "new@example.com",
      passwordHash: await argon2.hash("Senha123"),
      emailVerifiedAt: null,
      roles: []
    };
    const prisma = makePrismaMock({ user });
    const service = new AuthService(prisma as never, { signAsync: vi.fn() } as never, makeMailerMock() as never);

    const response = await service.resendEmailVerification(user.email);
    const token = new URL(response.devVerificationUrl ?? "").searchParams.get("token") ?? "";

    await expect(service.confirmEmail(token)).resolves.toMatchObject({ ok: true });
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("resets password and revokes active refresh tokens", async () => {
    const user = {
      id: "user-1",
      email: "reset@example.com",
      passwordHash: await argon2.hash("Senha123"),
      emailVerifiedAt: new Date(),
      roles: []
    };
    const prisma = makePrismaMock({ user });
    const service = new AuthService(prisma as never, { signAsync: vi.fn() } as never, makeMailerMock() as never);

    const response = await service.requestPasswordReset(user.email);
    const token = new URL(response.devResetUrl ?? "").searchParams.get("token") ?? "";

    await expect(service.resetPassword(token, "NovaSenha123")).resolves.toMatchObject({ ok: true });
    expect(await argon2.verify(user.passwordHash, "NovaSenha123")).toBe(true);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) }
    });
  });
});

function makeMailerMock() {
  return {
    sendEmailVerification: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined)
  };
}

function makePrismaMock({ user }: { user: Record<string, unknown> }) {
  const emailTokens: Array<Record<string, unknown>> = [];
  const resetTokens: Array<Record<string, unknown>> = [];

  return {
    user: {
      findUnique: vi.fn(({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email === user.email || where.id === user.id) return Promise.resolve(user);
        return Promise.resolve(null);
      }),
      update: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        Object.assign(user, data);
        return Promise.resolve(user);
      })
    },
    emailVerificationToken: {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        const token = { id: `email-token-${emailTokens.length + 1}`, usedAt: null, createdAt: new Date(), ...data };
        emailTokens.push(token);
        return Promise.resolve(token);
      }),
      findUnique: vi.fn(({ where }: { where: { tokenHash: string } }) => (
        Promise.resolve(emailTokens.find((token) => token.tokenHash === where.tokenHash) ?? null)
      )),
      update: vi.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const token = emailTokens.find((item) => item.id === where.id);
        Object.assign(token ?? {}, data);
        return Promise.resolve(token);
      })
    },
    passwordResetToken: {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        const token = { id: `reset-token-${resetTokens.length + 1}`, usedAt: null, createdAt: new Date(), ...data };
        resetTokens.push(token);
        return Promise.resolve(token);
      }),
      findUnique: vi.fn(({ where }: { where: { tokenHash: string } }) => (
        Promise.resolve(resetTokens.find((token) => token.tokenHash === where.tokenHash) ?? null)
      )),
      update: vi.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const token = resetTokens.find((item) => item.id === where.id);
        Object.assign(token ?? {}, data);
        return Promise.resolve(token);
      })
    },
    refreshToken: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    $transaction: vi.fn((operations: Array<Promise<unknown>>) => Promise.all(operations))
  };
}
