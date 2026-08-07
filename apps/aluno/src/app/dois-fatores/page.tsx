"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, ErrorState, Field, Input, LoadingState, useAuthSession } from "@foxtrot/ui";
import { AuthShell } from "../../components/AuthShell";
import { apiRequest } from "../../lib/api";
import { normalizeCode } from "../../lib/auth";

type TotpSetup = {
  secret: string;
  qrCodeDataUrl: string;
  otpauth?: string;
};

export default function TwoFactorPage() {
  const session = useAuthSession();
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function setupTotp() {
    setMessage("");
    setMessageTone("info");
    setBackupCodes([]);
    setLoadingSetup(true);
    try {
      const result = await apiRequest<TotpSetup>("/auth/2fa/setup", { method: "POST", body: "{}" });
      setSetup(result);
      setMessageTone("info");
      setMessage("Leia o QR Code no aplicativo autenticador e informe o codigo gerado.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Falha ao gerar 2FA.");
    } finally {
      setLoadingSetup(false);
    }
  }

  async function verifyTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeCode(code);
    if (!normalized) {
      setMessageTone("error");
      setMessage("Informe o codigo gerado pelo aplicativo autenticador.");
      return;
    }

    setVerifying(true);
    setMessage("");
    setMessageTone("info");
    try {
      const result = await apiRequest<{ backupCodes: string[] }>("/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code: normalized })
      });
      setBackupCodes(result.backupCodes);
      setSetup(null);
      setCode("");
      setMessageTone("success");
      setMessage("2FA ativado. Guarde os codigos de backup em local seguro.");
      await session.refresh();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Codigo 2FA invalido.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Segundo fator"
      title="Autenticacao 2FA"
      description="Ative um aplicativo autenticador para proteger login, pagamentos, dados pessoais e acoes sensiveis."
      aside={
        <div className="grid gap-3">
          <Badge tone="brand">TOTP</Badge>
          <Badge tone="success">Backup codes</Badge>
          <Badge tone="info">Sessao protegida</Badge>
        </div>
      }
    >
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black uppercase text-white">Dois fatores</h1>
            <p className="mt-2 text-sm text-zinc-400">Use Google Authenticator, 1Password, Authy ou aplicativo compativel.</p>
          </div>
          <LockKeyhole className="h-6 w-6 text-foxtrot-400" aria-hidden />
        </div>

        {session.status === "loading" && <div className="mt-6"><LoadingState label="Validando sessao..." /></div>}

        {session.status === "anonymous" && (
          <div className="mt-6">
            <ErrorState title="Entre para configurar" description="A ativacao do 2FA exige uma sessao autenticada." />
            <Link className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/login?next=/dois-fatores">
              Entrar e continuar
            </Link>
          </div>
        )}

        {session.status === "authenticated" && (
          <div className="mt-6 grid gap-5">
            <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">
              <strong className="block text-white">{session.user?.nickname}</strong>
              <span>{session.user?.email}</span>
              <div className="mt-3">
                <Badge tone={session.user?.twoFactorEnabled ? "success" : "warning"}>
                  {session.user?.twoFactorEnabled ? "2FA ativo" : "2FA pendente"}
                </Badge>
              </div>
            </div>

            {session.user?.twoFactorEnabled && backupCodes.length === 0 ? (
              <div className="rounded-md border border-green-900 bg-green-950/40 p-4 text-sm text-green-100" role="status">
                <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden />
                Sua conta ja esta protegida com autenticacao em dois fatores.
              </div>
            ) : (
              <>
                {!setup && (
                  <Button className="w-full" disabled={loadingSetup} onClick={setupTotp} type="button">
                    {loadingSetup ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    Gerar QR Code
                  </Button>
                )}

                {setup && (
                  <form className="grid gap-4" onSubmit={verifyTotp} noValidate>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
                      <img alt="QR Code para ativar 2FA" className="mx-auto w-48 rounded bg-white p-2" src={setup.qrCodeDataUrl} />
                      <p className="mt-3 break-all text-center text-xs text-zinc-500">{setup.secret}</p>
                    </div>
                    <Field label="Codigo do aplicativo" htmlFor="twoFactorCode">
                      <Input
                        autoComplete="one-time-code"
                        id="twoFactorCode"
                        inputMode="numeric"
                        maxLength={8}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder="000000"
                        required
                        value={code}
                      />
                    </Field>
                    <Button className="w-full" disabled={verifying} type="submit">
                      {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Ativar 2FA
                    </Button>
                  </form>
                )}
              </>
            )}

            {message && (
              messageTone === "error" ? (
                <ErrorState title="Status do 2FA" description={message} />
              ) : (
                <div
                  className={
                    messageTone === "success"
                      ? "rounded-md border border-green-900 bg-green-950/40 p-4 text-sm text-green-100"
                      : "rounded-md border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300"
                  }
                  role="status"
                >
                  {message}
                </div>
              )
            )}

            {backupCodes.length > 0 && (
              <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
                <h2 className="font-display text-xl font-bold uppercase text-white">Codigos de backup</h2>
                <p className="mt-2 text-sm text-zinc-400">Eles aparecem uma unica vez. Guarde antes de sair desta tela.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {backupCodes.map((backupCode) => (
                    <code className="rounded bg-zinc-950 px-2 py-2 text-center text-xs text-zinc-200" key={backupCode}>
                      {backupCode}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </AuthShell>
  );
}
