"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";
import { apiRequest, AuthProfile, hasAnyRole } from "../../lib/api";

type TotpSetup = {
  secret: string;
  qrCodeDataUrl: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Carregando conta...");

  useEffect(() => {
    void loadMe();
  }, []);

  async function loadMe() {
    try {
      const profile = await apiRequest<AuthProfile>("/auth/me");
      setUser(profile);
      setStatus("Sessao ativa.");
    } catch {
      setStatus("Entre para acessar sua conta.");
    }
  }

  async function refreshSession() {
    setStatus("Renovando sessao...");
    try {
      await apiRequest("/auth/refresh", { method: "POST", body: "{}" });
      await loadMe();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao renovar sessao.");
    }
  }

  async function setupTotp() {
    setStatus("Gerando 2FA...");
    try {
      setSetup(await apiRequest<TotpSetup>("/auth/2fa/setup", { method: "POST", body: "{}" }));
      setStatus("Leia o QR Code no autenticador e informe o codigo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao configurar 2FA.");
    }
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Verificando codigo...");
    try {
      const result = await apiRequest<{ backupCodes: string[] }>("/auth/2fa/verify", { method: "POST", body: JSON.stringify({ code }) });
      setBackupCodes(result.backupCodes);
      setSetup(null);
      setCode("");
      await loadMe();
      setStatus("2FA ativado. Guarde os codigos de backup.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Codigo invalido.");
    }
  }

  async function logout() {
    setStatus("Encerrando sessao...");
    try {
      await apiRequest("/auth/logout", { method: "POST", body: "{}" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <BrandMark />
          <Link className="text-sm text-foxtrot-400" href="/">Voltar</Link>
        </header>
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <article className="rounded-md border border-zinc-800 bg-zinc-950 p-6">
            <h1 className="font-display text-3xl font-black uppercase text-white">Conta</h1>
            <p className="mt-3 text-sm text-zinc-400">{status}</p>
            {user ? (
              <dl className="mt-6 grid gap-3 text-sm text-zinc-300">
                <div className="rounded border border-zinc-800 p-3">
                  <dt className="text-zinc-500">Nome</dt>
                  <dd>{user.fullName}</dd>
                </div>
                <div className="rounded border border-zinc-800 p-3">
                  <dt className="text-zinc-500">E-mail</dt>
                  <dd>{user.email}</dd>
                </div>
                <div className="rounded border border-zinc-800 p-3">
                  <dt className="text-zinc-500">Perfil</dt>
                  <dd>{hasAnyRole(user, ["ADMIN_MASTER"]) ? "Administrador" : hasAnyRole(user, ["PROFESSOR"]) ? "Professor" : "Aluno"}</dd>
                </div>
                <div className="rounded border border-zinc-800 p-3">
                  <dt className="text-zinc-500">2FA</dt>
                  <dd>{user.twoFactorEnabled ? "Ativo" : "Pendente"}</dd>
                </div>
              </dl>
            ) : (
              <Link className="mt-6 inline-flex text-sm text-foxtrot-400" href="/login">Entrar agora</Link>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" onClick={refreshSession} variant="ghost"><RefreshCw className="h-4 w-4" /> Renovar sessao</Button>
              <Button type="button" onClick={logout} variant="ghost"><LogOut className="h-4 w-4" /> Sair</Button>
            </div>
          </article>
          <aside className="rounded-md border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase text-white"><ShieldCheck className="h-5 w-5 text-foxtrot-400" /> 2FA</h2>
            {!setup ? (
              <Button className="mt-5 w-full" type="button" onClick={setupTotp}><QrCode className="h-4 w-4" /> Gerar QR Code</Button>
            ) : (
              <form onSubmit={verifyTotp} className="mt-5">
                <img alt="QR Code 2FA" className="rounded bg-white p-2" src={setup.qrCodeDataUrl} />
                <p className="mt-3 break-all text-xs text-zinc-500">{setup.secret}</p>
                <input className="mt-4 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white outline-none focus:border-orange-500" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" placeholder="Codigo" />
                <Button className="mt-4 w-full" type="submit">Ativar 2FA</Button>
              </form>
            )}
            {backupCodes.length > 0 && (
              <div className="mt-5 rounded border border-zinc-800 p-3">
                <h3 className="text-sm font-semibold text-white">Codigos de backup</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-300">
                  {backupCodes.map((backupCode) => (
                    <span key={backupCode} className="rounded bg-zinc-900 px-2 py-1">{backupCode}</span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
