import type { AuthProfile } from "@foxtrot/ui";

export type AuthFieldErrors = Partial<Record<"email" | "password" | "confirmPassword" | "fullName" | "nickname" | "token" | "twoFactorCode", string>>;

export type LoginResult = {
  requiresTwoFactor?: boolean;
  emailVerificationRequired?: boolean;
  message?: string;
  user?: AuthProfile;
};

export type RegisterResult = {
  user?: AuthProfile;
  twoFactorSetup?: {
    qrCodeDataUrl: string;
    secret: string;
    otpauth?: string;
  };
  devVerificationUrl?: string;
  emailVerificationSent?: boolean;
  rankingNotice?: string;
};

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function validateLoginForm(input: { email: string; password: string; needsTwoFactor?: boolean; twoFactorCode?: string }) {
  const errors: AuthFieldErrors = {};
  if (!validateEmail(input.email)) errors.email = "Informe um e-mail valido.";
  if (!input.password) errors.password = "Informe sua senha.";
  if (input.needsTwoFactor && !normalizeCode(input.twoFactorCode).length) {
    errors.twoFactorCode = "Informe o codigo 2FA ou codigo de backup.";
  }
  return errors;
}

export function validateRegisterForm(input: {
  fullName: string;
  nickname: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}) {
  const errors: AuthFieldErrors & { acceptedTerms?: string } = {};
  if (input.fullName.trim().length < 2) errors.fullName = "Informe seu nome completo.";
  if (input.nickname.trim().length < 2) errors.nickname = "Escolha um apelido com pelo menos 2 caracteres.";
  if (!validateEmail(input.email)) errors.email = "Informe um e-mail valido.";
  if (!validatePassword(input.password)) errors.password = "Use pelo menos 8 caracteres, com letras e numeros.";
  if (input.confirmPassword !== input.password) errors.confirmPassword = "As senhas precisam ser iguais.";
  if (!input.acceptedTerms) errors.acceptedTerms = "Aceite os termos para criar a conta.";
  return errors;
}

export function validatePasswordRecovery(email: string) {
  return validateEmail(email) ? {} : { email: "Informe o e-mail cadastrado." };
}

export function validatePasswordReset(input: { token: string; password: string; confirmPassword: string }) {
  const errors: AuthFieldErrors = {};
  if (!input.token.trim()) errors.token = "Informe o token recebido por e-mail.";
  if (!validatePassword(input.password)) errors.password = "Use pelo menos 8 caracteres, com letras e numeros.";
  if (input.confirmPassword !== input.password) errors.confirmPassword = "As senhas precisam ser iguais.";
  return errors;
}

export function validateToken(token: string) {
  return token.trim() ? {} : { token: "Informe o token de confirmacao." };
}

export function normalizeCode(code?: string) {
  return (code ?? "").replace(/\s+/g, "").trim();
}

export function isEmptyErrors(errors: Record<string, string | undefined>) {
  return Object.values(errors).every((value) => !value);
}

export function getProfileRedirectPath(profile?: Pick<AuthProfile, "roles"> | null) {
  if (!profile) return "/";
  if (profile.roles.includes("ADMIN_MASTER")) return process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
  if (profile.roles.includes("PROFESSOR")) return process.env.NEXT_PUBLIC_PROFESSOR_URL ?? "http://localhost:3002";
  return "/";
}

export function getSafeNextPath(next?: string | null) {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
