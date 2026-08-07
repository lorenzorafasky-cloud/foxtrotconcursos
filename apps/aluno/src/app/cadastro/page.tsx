"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { QrCode, UserPlus } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";
import { apiRequest } from "../../lib/api";

type RegisterResponse = {
  twoFactorSetup?: { qrCodeDataUrl: string; secret: string };
  rankingNotice?: string;
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Criando conta...");
    try {
      const response = await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, nickname, email, password })
      });
      setResult(response);
      setStatus("Conta criada. Configure o 2FA antes de seguir.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha no cadastro.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className="rounded-md border border-zinc-800 bg-zinc-950 p-6">
          <BrandMark />
          <h1 className="mt-8 font-display text-4xl font-black uppercase text-white">Cadastro</h1>
          <p className="mt-2 text-sm text-zinc-400">Seu apelido aparecera no ranking publico; seu nome nunca e exibido a outros usuarios.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-zinc-300">
              Nome completo
              <input className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </label>
            <label className="text-sm text-zinc-300">
              Apelido publico
              <input className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500" value={nickname} onChange={(event) => setNickname(event.target.value)} />
            </label>
            <label className="text-sm text-zinc-300">
              E-mail
              <input className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </label>
            <label className="text-sm text-zinc-300">
              Senha
              <input className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </label>
          </div>
          <Button className="mt-6" type="submit"><UserPlus className="h-4 w-4" /> Criar conta</Button>
          <p className="mt-4 min-h-5 text-sm text-zinc-400">{status}</p>
          <Link className="text-sm text-foxtrot-400" href="/login">Ja tenho conta</Link>
        </form>
        <aside className="rounded-md border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold uppercase text-white"><QrCode className="h-5 w-5 text-foxtrot-400" /> 2FA</h2>
          {result?.twoFactorSetup ? (
            <div className="mt-5">
              <img alt="QR Code 2FA" className="rounded bg-white p-2" src={result.twoFactorSetup.qrCodeDataUrl} />
              <p className="mt-3 break-all text-xs text-zinc-500">{result.twoFactorSetup.secret}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-400">Depois do cadastro, o QR Code TOTP aparece aqui.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
