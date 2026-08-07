"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";
import { apiRequest } from "../../lib/api";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Redefinindo senha...");
    try {
      const result = await apiRequest<{ message: string }>("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      setStatus(result.message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao redefinir senha.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-md border border-zinc-800 bg-zinc-950 p-6">
        <BrandMark />
        <h1 className="mt-8 font-display text-3xl font-black uppercase text-white">Redefinir senha</h1>
        <label className="mt-6 block text-sm text-zinc-300">
          Token
          <input className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500" value={token} onChange={(event) => setToken(event.target.value)} />
        </label>
        <label className="mt-4 block text-sm text-zinc-300">
          Nova senha
          <input className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        <Button className="mt-6 w-full" type="submit"><KeyRound className="h-4 w-4" /> Salvar senha</Button>
        <p className="mt-4 min-h-5 text-sm text-zinc-400">{status}</p>
        <Link className="text-sm text-foxtrot-400" href="/login">Entrar</Link>
      </form>
    </main>
  );
}
