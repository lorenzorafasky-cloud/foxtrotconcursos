"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button, Card, ErrorState, Field, Input } from "@foxtrot/ui";
import { AuthShell } from "../../components/AuthShell";
import { apiRequest } from "../../lib/api";
import { isEmptyErrors, validatePasswordRecovery, type AuthFieldErrors } from "../../lib/auth";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validatePasswordRecovery(email);
    setErrors(validation);
    setMessage("");
    setDevResetUrl("");
    if (!isEmptyErrors(validation)) return;

    setLoading(true);
    try {
      const result = await apiRequest<{ message: string; devResetUrl?: string }>("/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() })
      });
      setMessage(result.message);
      setDevResetUrl(result.devResetUrl ?? "");
    } catch (error) {
      setErrors({ email: error instanceof Error ? error.message : "Falha ao solicitar recuperacao." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Recuperacao"
      title="Voltar ao acesso"
      description="Informe seu e-mail para receber um link de redefinicao. A resposta e sempre discreta para proteger contas existentes."
      footer={
        <Link className="inline-flex items-center gap-2 font-semibold text-foxtrot-300 hover:text-foxtrot-200" href="/login">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>
      }
    >
      <Card className="p-6">
        <h1 className="font-display text-3xl font-black uppercase text-white">Recuperar senha</h1>
        <p className="mt-2 text-sm text-zinc-400">Use o mesmo e-mail do cadastro.</p>
        <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <Input autoComplete="email" id="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </Field>
          {message && (
            <div className="rounded-md border border-green-900 bg-green-950/40 p-4 text-sm text-green-100" role="status">
              {message}
            </div>
          )}
          {devResetUrl && (
            <Link className="break-all rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-foxtrot-300" href={devResetUrl}>
              Abrir link local de redefinicao
            </Link>
          )}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Enviar instrucoes
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
