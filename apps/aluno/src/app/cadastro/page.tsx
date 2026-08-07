"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, QrCode, ShieldCheck, UserPlus } from "lucide-react";
import { Badge, Button, Card, ErrorState, Field, Input } from "@foxtrot/ui";
import { AuthShell } from "../../components/AuthShell";
import { apiRequest } from "../../lib/api";
import { isEmptyErrors, validateRegisterForm, type AuthFieldErrors, type RegisterResult } from "../../lib/auth";

type RegisterErrors = AuthFieldErrors & { acceptedTerms?: string };

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateRegisterForm({ fullName, nickname, email, password, confirmPassword, acceptedTerms });
    setErrors(validation);
    setMessage("");
    if (!isEmptyErrors(validation)) return;

    setLoading(true);
    try {
      const response = await apiRequest<RegisterResult>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          nickname: nickname.trim(),
          email: email.trim(),
          password
        })
      });
      setResult(response);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no cadastro.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <AuthShell
        eyebrow="Conta criada"
        title="Confirme seu e-mail"
        description="O acesso so e liberado depois da confirmacao. Em desenvolvimento, o link local aparece na resposta para facilitar testes."
      >
        <Card className="p-6">
          <CheckCircle2 className="h-10 w-10 text-green-400" aria-hidden />
          <h1 className="mt-4 font-display text-3xl font-black uppercase text-white">Cadastro recebido</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Enviamos as instrucoes para <strong className="text-zinc-100">{email}</strong>. Confirme o e-mail e depois entre para ativar a autenticacao em dois fatores.
          </p>
          {result.rankingNotice && <p className="mt-3 rounded-md bg-zinc-900 p-3 text-sm text-zinc-300">{result.rankingNotice}</p>}
          {result.devVerificationUrl && (
            <Link className="mt-4 block break-all text-sm font-semibold text-foxtrot-300" href={result.devVerificationUrl}>
              Confirmar e-mail em desenvolvimento
            </Link>
          )}
          {result.twoFactorSetup && (
            <div className="mt-5 rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <QrCode className="h-4 w-4 text-foxtrot-400" aria-hidden /> Pre-configuracao 2FA
              </div>
              <img alt="QR Code 2FA" className="mt-4 w-40 rounded bg-white p-2" src={result.twoFactorSetup.qrCodeDataUrl} />
              <p className="mt-3 break-all text-xs text-zinc-500">{result.twoFactorSetup.secret}</p>
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link className="inline-flex h-10 items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/login">
              Ir para login
            </Link>
            <Link className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href="/dois-fatores">
              Ativar 2FA depois
            </Link>
          </div>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Nova conta"
      title="Cadastro Foxtrot"
      description="Crie sua identidade de estudo. O apelido e usado em ranking; nome completo e e-mail ficam privados."
      aside={
        <div className="grid gap-3">
          <Badge tone="brand">E-mail confirmado</Badge>
          <Badge tone="success">Senha forte</Badge>
          <Badge tone="info">2FA preparado</Badge>
        </div>
      }
      footer={
        <>
          Ja tem conta?{" "}
          <Link className="font-semibold text-foxtrot-300 hover:text-foxtrot-200" href="/login">
            Entrar
          </Link>
        </>
      }
    >
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black uppercase text-white">Criar conta</h1>
            <p className="mt-2 text-sm text-zinc-400">Todos os campos sao obrigatorios.</p>
          </div>
          <UserPlus className="h-6 w-6 text-foxtrot-400" aria-hidden />
        </div>

        <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
          <Field label="Nome completo" htmlFor="fullName" error={errors.fullName}>
            <Input autoComplete="name" id="fullName" onChange={(event) => setFullName(event.target.value)} required value={fullName} />
          </Field>
          <Field label="Apelido publico" htmlFor="nickname" error={errors.nickname} hint="Esse nome aparece em ranking e desafios.">
            <Input autoComplete="nickname" id="nickname" onChange={(event) => setNickname(event.target.value)} required value={nickname} />
          </Field>
          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <Input autoComplete="email" id="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </Field>
          <Field label="Senha" htmlFor="password" error={errors.password} hint="Minimo de 8 caracteres, com letras e numeros.">
            <Input autoComplete="new-password" id="password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </Field>
          <Field label="Confirmar senha" htmlFor="confirmPassword" error={errors.confirmPassword}>
            <Input
              autoComplete="new-password"
              id="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </Field>
          <label className="flex items-start gap-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-300">
            <input
              checked={acceptedTerms}
              className="mt-1 h-4 w-4 accent-foxtrot-500"
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              type="checkbox"
            />
            <span>
              Li e aceito os{" "}
              <Link className="text-foxtrot-300" href="/termos">
                Termos
              </Link>{" "}
              e a{" "}
              <Link className="text-foxtrot-300" href="/privacidade">
                Politica de privacidade
              </Link>
              .
              {errors.acceptedTerms && <span className="mt-1 block text-xs text-red-300">{errors.acceptedTerms}</span>}
            </span>
          </label>

          {message && <ErrorState title="Cadastro nao concluido" description={message} />}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Criar conta
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
