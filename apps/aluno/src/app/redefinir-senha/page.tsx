"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Button, Card, ErrorState, Field, Input } from "@foxtrot/ui";
import { AuthShell } from "../../components/AuthShell";
import { apiRequest } from "../../lib/api";
import { isEmptyErrors, validatePasswordReset, type AuthFieldErrors } from "../../lib/auth";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validatePasswordReset({ token, password, confirmPassword });
    setErrors(validation);
    setMessage("");
    if (!isEmptyErrors(validation)) return;

    setLoading(true);
    try {
      const result = await apiRequest<{ message: string }>("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ token: token.trim(), password })
      });
      setSuccess(true);
      setMessage(result.message);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Nova senha"
      title="Redefinir acesso"
      description="Crie uma senha forte. Apos a troca, sessoes antigas sao invalidadas pela API."
    >
      <Card className="p-6">
        <h1 className="font-display text-3xl font-black uppercase text-white">Redefinir senha</h1>
        <p className="mt-2 text-sm text-zinc-400">Cole o token do e-mail se ele nao foi preenchido automaticamente.</p>
        <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
          <Field label="Token" htmlFor="token" error={errors.token}>
            <Input id="token" onChange={(event) => setToken(event.target.value)} required value={token} />
          </Field>
          <Field label="Nova senha" htmlFor="password" error={errors.password} hint="Minimo de 8 caracteres, com letras e numeros.">
            <Input autoComplete="new-password" id="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </Field>
          <Field label="Confirmar nova senha" htmlFor="confirmPassword" error={errors.confirmPassword}>
            <Input
              autoComplete="new-password"
              id="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </Field>
          {message && (
            success ? (
              <div className="rounded-md border border-green-900 bg-green-950/40 p-4 text-sm text-green-100" role="status">
                <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden />
                {message}
              </div>
            ) : (
              <ErrorState title="Nao foi possivel redefinir" description={message} />
            )
          )}
          <Button className="w-full" disabled={loading || success} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Salvar nova senha
          </Button>
        </form>
        {success && (
          <Link className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/login">
            Entrar com nova senha
          </Link>
        )}
      </Card>
    </AuthShell>
  );
}
