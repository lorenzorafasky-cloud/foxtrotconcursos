"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MailCheck, RotateCw } from "lucide-react";
import { Button, Card, ErrorState, Field, Input } from "@foxtrot/ui";
import { AuthShell } from "../../components/AuthShell";
import { apiRequest } from "../../lib/api";
import { isEmptyErrors, validateEmail, validateToken, type AuthFieldErrors } from "../../lib/auth";

export default function ConfirmEmailPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [message, setMessage] = useState("");
  const [devVerificationUrl, setDevVerificationUrl] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(value);
    if (value) void confirm(value);
  }, []);

  async function confirm(value: string) {
    const validation = validateToken(value);
    setErrors(validation);
    setMessage("");
    setSuccess(false);
    if (!isEmptyErrors(validation)) return;

    setLoading(true);
    try {
      const result = await apiRequest<{ message: string }>("/auth/email/confirm", {
        method: "POST",
        body: JSON.stringify({ token: value.trim() })
      });
      setSuccess(true);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao confirmar e-mail.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await confirm(token);
  }

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDevVerificationUrl("");
    if (!validateEmail(email)) {
      setErrors({ email: "Informe um e-mail valido para reenviar." });
      return;
    }
    setErrors({});
    setResending(true);
    try {
      const result = await apiRequest<{ message: string; devVerificationUrl?: string }>("/auth/email/resend", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() })
      });
      setMessage(result.message);
      setDevVerificationUrl(result.devVerificationUrl ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao reenviar confirmacao.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Verificacao"
      title="Confirmar e-mail"
      description="A confirmacao protege sua conta e libera o primeiro login. Links expirados podem ser reenviados."
    >
      <div className="grid gap-4">
        <Card className="p-6">
          <h1 className="font-display text-3xl font-black uppercase text-white">Confirmacao</h1>
          <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
            <Field label="Token" htmlFor="token" error={errors.token}>
              <Input id="token" onChange={(event) => setToken(event.target.value)} required value={token} />
            </Field>
            {message && (
              success ? (
                <div className="rounded-md border border-green-900 bg-green-950/40 p-4 text-sm text-green-100" role="status">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden />
                  {message}
                </div>
              ) : (
                <ErrorState title="Confirmacao pendente" description={message} />
              )
            )}
            <Button className="w-full" disabled={loading || success} type="submit">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
              Confirmar e-mail
            </Button>
            {success && (
              <Link className="inline-flex h-10 items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/login">
                Ir para login
              </Link>
            )}
          </form>
        </Card>

        {!success && (
          <Card className="p-6">
            <h2 className="font-display text-xl font-bold uppercase text-white">Reenviar link</h2>
            <form className="mt-4 grid gap-4" onSubmit={resend} noValidate>
              <Field label="E-mail" htmlFor="resendEmail" error={errors.email}>
                <Input id="resendEmail" inputMode="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
              </Field>
              {devVerificationUrl && (
                <Link className="break-all rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-foxtrot-300" href={devVerificationUrl}>
                  Abrir novo link local
                </Link>
              )}
              <Button className="w-full" disabled={resending} type="submit" variant="outline">
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                Reenviar confirmacao
              </Button>
            </form>
          </Card>
        )}
      </div>
    </AuthShell>
  );
}
