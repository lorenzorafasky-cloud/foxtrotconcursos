"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, LogIn, MailCheck, RotateCw, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, ErrorState, Field, Input, Tabs, useAuthSession } from "@foxtrot/ui";
import { AuthShell } from "../../components/AuthShell";
import { apiRequest } from "../../lib/api";
import {
  getProfileRedirectPath,
  getSafeNextPath,
  isEmptyErrors,
  normalizeCode,
  validateLoginForm,
  type AuthFieldErrors,
  type LoginResult
} from "../../lib/auth";

type ChallengeMode = "totp" | "backup";

export default function LoginPage() {
  const session = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>("totp");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});

  useEffect(() => {
    setNextPath(getSafeNextPath(new URLSearchParams(window.location.search).get("next")));
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") {
      window.location.assign(nextPath ?? getProfileRedirectPath(session.user));
    }
  }, [nextPath, session.status, session.user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateLoginForm({ email, password, needsTwoFactor, twoFactorCode: challengeMode === "totp" ? twoFactorCode : backupCode });
    setErrors(validation);
    setMessage("");
    setSuccess("");
    setNeedsEmail(false);
    if (!isEmptyErrors(validation)) return;

    setLoading(true);
    try {
      const result = await apiRequest<LoginResult>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          twoFactorCode: challengeMode === "totp" ? normalizeCode(twoFactorCode) || undefined : undefined,
          backupCode: challengeMode === "backup" ? normalizeCode(backupCode) || undefined : undefined
        })
      });

      if (result.emailVerificationRequired) {
        setNeedsEmail(true);
        setMessage(result.message ?? "Confirme seu e-mail antes de entrar.");
        return;
      }

      if (result.requiresTwoFactor) {
        setNeedsTwoFactor(true);
        setMessage("Informe seu codigo de autenticacao em dois fatores.");
        return;
      }

      setSuccess("Login confirmado. Redirecionando...");
      await session.refresh();
      window.location.assign(nextPath ?? getProfileRedirectPath(result.user));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    const validation = validateLoginForm({ email, password: "Senha123" });
    if (validation.email) {
      setErrors({ email: validation.email });
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess("");
    try {
      const result = await apiRequest<{ message: string; devVerificationUrl?: string }>("/auth/email/resend", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() })
      });
      setSuccess(result.message);
      if (result.devVerificationUrl) setMessage(`Link local: ${result.devVerificationUrl}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao reenviar confirmacao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Acesso seguro"
      title="Entrar na plataforma"
      description="Sessao com cookies seguros, renovacao por refresh token e desafio 2FA quando ativado na conta."
      aside={
        <div className="grid gap-3 sm:grid-cols-3">
          <Badge tone="brand">JWT</Badge>
          <Badge tone="success">2FA</Badge>
          <Badge tone="info">Perfis</Badge>
        </div>
      }
      footer={
        <>
          Ainda nao tem conta?{" "}
          <Link className="font-semibold text-foxtrot-300 hover:text-foxtrot-200" href="/cadastro">
            Criar cadastro
          </Link>
        </>
      }
    >
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black uppercase text-white">Login</h1>
            <p className="mt-2 text-sm text-zinc-400">Use seu e-mail cadastrado para continuar.</p>
          </div>
          <ShieldCheck className="h-6 w-6 text-foxtrot-400" aria-hidden />
        </div>

        <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <Input
              autoComplete="email"
              id="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </Field>
          <Field label="Senha" htmlFor="password" error={errors.password}>
            <Input
              autoComplete="current-password"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </Field>

          {needsTwoFactor && (
            <div className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
              <Tabs<ChallengeMode>
                items={[
                  { id: "totp", label: "Aplicativo" },
                  { id: "backup", label: "Backup" }
                ]}
                onChange={setChallengeMode}
                value={challengeMode}
              />
              {challengeMode === "totp" ? (
                <Field label="Codigo 2FA" htmlFor="twoFactorCode" error={errors.twoFactorCode}>
                  <Input
                    autoComplete="one-time-code"
                    id="twoFactorCode"
                    inputMode="numeric"
                    maxLength={8}
                    onChange={(event) => setTwoFactorCode(event.target.value)}
                    placeholder="000000"
                    value={twoFactorCode}
                  />
                </Field>
              ) : (
                <Field label="Codigo de backup" htmlFor="backupCode" error={errors.twoFactorCode}>
                  <Input
                    autoComplete="one-time-code"
                    id="backupCode"
                    onChange={(event) => setBackupCode(event.target.value)}
                    placeholder="ABCD1234"
                    value={backupCode}
                  />
                </Field>
              )}
            </div>
          )}

          {message && <ErrorState title="Atencao" description={message} />}
          {success && (
            <div className="rounded-md border border-green-900 bg-green-950/40 p-4 text-sm text-green-100" role="status">
              {success}
            </div>
          )}

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {needsTwoFactor ? "Validar e entrar" : "Entrar"}
          </Button>
        </form>

        {needsEmail && (
          <Button className="mt-3 w-full" disabled={loading} onClick={resendVerification} type="button" variant="outline">
            <RotateCw className="h-4 w-4" /> Reenviar confirmacao
          </Button>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link className="inline-flex items-center gap-2 text-zinc-400 hover:text-foxtrot-300" href="/recuperar-senha">
            <KeyRound className="h-4 w-4" /> Esqueci minha senha
          </Link>
          <Link className="inline-flex items-center gap-2 text-zinc-400 hover:text-foxtrot-300" href="/confirmar-email">
            <MailCheck className="h-4 w-4" /> Confirmar e-mail
          </Link>
        </div>
      </Card>
    </AuthShell>
  );
}
