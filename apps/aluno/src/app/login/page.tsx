"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LogIn, RotateCw, ShieldCheck } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";
import { apiRequest } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNeedsEmail(false);
    setStatus("Autenticando...");
    try {
      const result = await apiRequest<{
        requiresTwoFactor?: boolean;
        emailVerificationRequired?: boolean;
        message?: string;
        user?: { nickname: string; roles: string[] };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode || undefined })
      });
      if (result.emailVerificationRequired) {
        setNeedsEmail(true);
        setStatus(result.message ?? "Confirme seu e-mail antes de entrar.");
        return;
      }
      if (result.requiresTwoFactor) {
        setNeedsTwoFactor(true);
        setStatus("Informe o codigo 2FA para concluir.");
        return;
      }
      setStatus(`Bem-vindo, ${result.user?.nickname ?? "operador"}. Redirecionando...`);
      window.location.href = "/";
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha no login.");
    }
  }

  async function resendVerification() {
    setStatus("Enviando novo link...");
    try {
      const result = await apiRequest<{ message: string; devVerificationUrl?: string }>("/auth/email/resend", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setStatus(result.devVerificationUrl ? `${result.message} Link local: ${result.devVerificationUrl}` : result.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao reenviar confirmacao.");
    }
  }

  return (
    <main className="grid min-h-screen bg-zinc-950 lg:grid-cols-[1fr_480px]">
      <section className="relative hidden overflow-hidden border-r border-zinc-800 lg:block">
        <img
          alt="Central de estudos"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop"
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <BrandMark />
          <div>
            <h1 className="font-display text-5xl font-black uppercase text-white">Entrar na operacao</h1>
          <p className="mt-3 max-w-xl text-zinc-300">Acesse aulas, questoes, foco e ranking com sessao protegida por JWT, cookies seguros e 2FA.</p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-sm rounded-md border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <h2 className="font-display text-3xl font-black uppercase text-white">Login</h2>
          <label className="mt-6 block text-sm text-zinc-300">
            E-mail
            <input className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label className="mt-4 block text-sm text-zinc-300">
            Senha
            <input className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          <label className="mt-4 block text-sm text-zinc-300">
            Codigo 2FA
            <input className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500 disabled:opacity-60" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} inputMode="numeric" disabled={!needsTwoFactor} />
          </label>
          <Button className="mt-6 w-full" type="submit"><LogIn className="h-4 w-4" /> Entrar</Button>
          <p className="mt-4 min-h-5 text-sm text-zinc-400">{status}</p>
          {needsEmail && (
            <button type="button" onClick={resendVerification} className="mt-2 inline-flex items-center gap-2 text-sm text-foxtrot-400">
              <RotateCw className="h-4 w-4" /> Reenviar confirmacao
            </button>
          )}
          <Link className="mt-4 block text-sm text-zinc-500" href="/recuperar-senha">Esqueci minha senha</Link>
          <Link className="mt-4 inline-flex items-center gap-2 text-sm text-foxtrot-400" href="/cadastro">
            <ShieldCheck className="h-4 w-4" /> Criar conta operacional
          </Link>
        </form>
      </section>
    </main>
  );
}
