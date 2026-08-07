"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";
import { apiRequest } from "../../lib/api";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Solicitando instrucoes...");
    try {
      const result = await apiRequest<{ message: string; devResetUrl?: string }>("/auth/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setStatus(result.devResetUrl ? `${result.message} Link local: ${result.devResetUrl}` : result.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao solicitar recuperacao.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-md border border-zinc-800 bg-zinc-950 p-6">
        <BrandMark />
        <h1 className="mt-8 font-display text-3xl font-black uppercase text-white">Recuperar senha</h1>
        <label className="mt-6 block text-sm text-zinc-300">
          E-mail
          <input className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <Button className="mt-6 w-full" type="submit"><Mail className="h-4 w-4" /> Enviar instrucoes</Button>
        <p className="mt-4 min-h-5 break-all text-sm text-zinc-400">{status}</p>
        <Link className="text-sm text-foxtrot-400" href="/login">Voltar ao login</Link>
      </form>
    </main>
  );
}
