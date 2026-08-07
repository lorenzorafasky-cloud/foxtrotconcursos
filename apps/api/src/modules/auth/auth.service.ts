import argon2 from "argon2";
import QRCode from "qrcode";
import { createHash, randomBytes } from "node:crypto";
import { authenticator } from "otplib";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../core/prisma.service";
import { LoginDto, OnboardingDto, RegisterDto } from "./auth.dto";
import { MailerService } from "./mailer.service";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService
  ) {}

  async register(input: RegisterDto) {
    await this.verifyTurnstile(input.turnstileToken);
    this.assertPasswordStrength(input.password);
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { nickname: input.nickname }] }
    });
    if (exists) throw new BadRequestException("E-mail ou apelido ja cadastrado.");

    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: "ALUNO_CURSO_ESPECIFICO" } });
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        nickname: input.nickname,
        passwordHash: await argon2.hash(this.withPepper(input.password)),
        roles: { create: { roleId: role.id } }
      }
    });

    const setup = await this.createTotpSetup(user.id);
    const verification = await this.createEmailVerification(user.id, user.email);
    return {
      user: this.publicUser(user),
      twoFactorSetup: setup,
      emailVerificationSent: true,
      devVerificationUrl: verification.devUrl,
      rankingNotice: "Seu apelido aparecera no ranking publico; seu nome nunca e exibido a outros usuarios."
    };
  }

  async login(input: LoginDto) {
    await this.verifyTurnstile(input.turnstileToken);
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }
    });
    if (!user || !(await argon2.verify(user.passwordHash, this.withPepper(input.password)))) {
      throw new UnauthorizedException("Credenciais invalidas.");
    }

    if (!user.emailVerifiedAt) {
      return {
        emailVerificationRequired: true,
        message: "Confirme seu e-mail antes de entrar."
      };
    }

    if (user.twoFactorEnabled) {
      const validTotp = input.twoFactorCode && user.twoFactorSecret
        ? authenticator.check(input.twoFactorCode, user.twoFactorSecret)
        : false;
      const validBackup = input.backupCode ? await this.consumeBackupCode(user.id, input.backupCode) : false;
      if (!validTotp && !validBackup) {
        return { requiresTwoFactor: true };
      }
    }

    return this.issueTokens(user.id);
  }

  async confirmEmail(rawToken: string) {
    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) }
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new BadRequestException("Link de confirmacao invalido ou expirado.");
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: new Date() }
      })
    ]);

    return { ok: true, message: "E-mail confirmado com sucesso." };
  }

  async resendEmailVerification(email: string, turnstileToken?: string) {
    await this.verifyTurnstile(turnstileToken);
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.emailVerifiedAt) {
      return { ok: true, message: "Se houver uma conta pendente, enviaremos um novo link." };
    }

    const verification = await this.createEmailVerification(user.id, user.email);
    return {
      ok: true,
      message: "Se houver uma conta pendente, enviaremos um novo link.",
      devVerificationUrl: verification.devUrl
    };
  }

  async requestPasswordReset(email: string, turnstileToken?: string) {
    await this.verifyTurnstile(turnstileToken);
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return { ok: true, message: "Se o e-mail estiver cadastrado, enviaremos as instrucoes." };
    }

    const reset = await this.createPasswordReset(user.id, user.email);
    return {
      ok: true,
      message: "Se o e-mail estiver cadastrado, enviaremos as instrucoes.",
      devResetUrl: reset.devUrl
    };
  }

  async resetPassword(rawToken: string, password: string) {
    this.assertPasswordStrength(password);
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) }
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new BadRequestException("Link de redefinicao invalido ou expirado.");
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.user.update({
        where: { id: token.userId },
        data: {
          passwordHash: await argon2.hash(this.withPepper(password)),
          emailVerifiedAt: new Date()
        }
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    return { ok: true, message: "Senha redefinida. Entre novamente." };
  }

  async refresh(rawRefreshToken?: string) {
    if (!rawRefreshToken) throw new UnauthorizedException("Refresh token ausente.");
    const payload = await this.jwt.verifyAsync<{ id: string }>(rawRefreshToken, {
      secret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret"
    });
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId: payload.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });
    for (const token of tokens) {
      if (await argon2.verify(token.tokenHash, rawRefreshToken)) {
        await this.prisma.refreshToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
        return this.issueTokens(payload.id);
      }
    }
    throw new UnauthorizedException("Refresh token invalido.");
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return { ok: true };
  }

  async createTotpSetup(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, process.env.TOTP_ISSUER ?? "Foxtrot Concursos", secret);
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
    return { secret, otpauth, qrCodeDataUrl };
  }

  async verifyTotp(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecret || !authenticator.check(code, user.twoFactorSecret)) {
      throw new BadRequestException("Codigo TOTP invalido.");
    }

    const rawCodes = Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 10).toUpperCase());
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
    await this.prisma.backupCode.deleteMany({ where: { userId } });
    for (const codeValue of rawCodes) {
      await this.prisma.backupCode.create({
        data: { userId, codeHash: await argon2.hash(codeValue) }
      });
    }

    return { backupCodes: rawCodes };
  }

  async onboarding(userId: string, input: OnboardingDto) {
    const profile = await this.prisma.onboardingProfile.upsert({
      where: { userId },
      update: {
        age: input.age,
        studyExperience: input.studyExperience,
        careerGoal: input.careerGoal,
        targetExamId: input.targetExamId,
        platformGoals: input.platformGoals,
        dailyNetStudyGoalMins: input.dailyNetStudyGoalMins,
        weeklyQuestionGoal: input.weeklyQuestionGoal ?? 150,
        examDate: input.examDate ? new Date(input.examDate) : null
      },
      create: {
        userId,
        age: input.age,
        studyExperience: input.studyExperience,
        careerGoal: input.careerGoal,
        targetExamId: input.targetExamId,
        platformGoals: input.platformGoals,
        dailyNetStudyGoalMins: input.dailyNetStudyGoalMins,
        weeklyQuestionGoal: input.weeklyQuestionGoal ?? 150,
        examDate: input.examDate ? new Date(input.examDate) : null
      }
    });
    await this.prisma.user.update({ where: { id: userId }, data: { onboardingComplete: true } });
    return profile;
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }
    });
    return this.publicUser(user);
  }

  private async issueTokens(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }
    });
    if (!user.emailVerifiedAt) throw new UnauthorizedException("Confirme seu e-mail antes de entrar.");
    const roles = user.roles.map((item) => item.role.name);
    const permissions = [
      ...new Set(user.roles.flatMap((item) => item.role.permissions.map((rp) => rp.permission.key)))
    ];
    const payload = { id: user.id, email: user.email, roles, permissions };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
      expiresIn: "15m"
    });
    const refreshToken = await this.jwt.signAsync({ id: user.id }, {
      secret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
      expiresIn: "30d"
    });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    return { accessToken, refreshToken, user: this.publicUser(user) };
  }

  private async consumeBackupCode(userId: string, rawCode: string) {
    const codes = await this.prisma.backupCode.findMany({ where: { userId, usedAt: null } });
    for (const code of codes) {
      if (await argon2.verify(code.codeHash, rawCode)) {
        await this.prisma.backupCode.update({ where: { id: code.id }, data: { usedAt: new Date() } });
        return true;
      }
    }
    return false;
  }

  private withPepper(password: string) {
    return `${password}${process.env.PASSWORD_PEPPER ?? ""}`;
  }

  private publicUser(user: {
    id: string;
    email: string;
    fullName: string;
    nickname: string;
    twoFactorEnabled: boolean;
    emailVerifiedAt?: Date | null;
    roles?: Array<{
      role: {
        name: string;
        permissions?: Array<{ permission: { key: string } }>;
      };
    }>;
  }) {
    const roles = user.roles?.map((item) => item.role.name) ?? [];
    const permissions = [
      ...new Set(user.roles?.flatMap((item) => item.role.permissions?.map((rp) => rp.permission.key) ?? []) ?? [])
    ];

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      nickname: user.nickname,
      twoFactorEnabled: user.twoFactorEnabled,
      emailVerified: Boolean(user.emailVerifiedAt),
      roles,
      permissions
    };
  }

  private async createEmailVerification(userId: string, email: string) {
    const rawToken = this.createRawToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)
      }
    });
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/confirmar-email?token=${encodeURIComponent(rawToken)}`;
    await this.mailer.sendEmailVerification(email, url);
    return { devUrl: this.devOnlyUrl(url) };
  }

  private async createPasswordReset(userId: string, email: string) {
    const rawToken = this.createRawToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS)
      }
    });
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/redefinir-senha?token=${encodeURIComponent(rawToken)}`;
    await this.mailer.sendPasswordReset(email, url);
    return { devUrl: this.devOnlyUrl(url) };
  }

  private createRawToken() {
    return randomBytes(32).toString("base64url");
  }

  private hashToken(rawToken: string) {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  private devOnlyUrl(url: string) {
    return process.env.NODE_ENV === "production" ? undefined : url;
  }

  private assertPasswordStrength(password: string) {
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new BadRequestException("A senha deve ter pelo menos 8 caracteres, com letras e numeros.");
    }
  }

  private async verifyTurnstile(token?: string) {
    const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    if (!secret || process.env.NODE_ENV === "test") return;
    if (!token) throw new BadRequestException("Token Turnstile ausente.");
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token })
    });
    const result = (await response.json()) as { success: boolean };
    if (!result.success) throw new BadRequestException("Validacao Turnstile recusada.");
  }
}
