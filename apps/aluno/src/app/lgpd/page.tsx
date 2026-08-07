"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileText, Loader2, Send } from "lucide-react";
import { LegalPage } from "../../components/LegalPage";
import { apiRequest } from "../../lib/api";

const requestTypes = [
  ["ACCESS", "Acesso aos dados"],
  ["CORRECTION", "Correcao de dados"],
  ["DELETION", "Exclusao"],
  ["PORTABILITY", "Portabilidade"],
  ["ANONYMIZATION", "Anonimizacao"],
  ["CONSENT_WITHDRAWAL", "Revogar consentimento"],
  ["AUTOMATED_DECISION_REVIEW", "Revisao de decisao automatizada"]
] as const;

type PrivacyRequest = {
  id: string;
  type: string;
  status: string;
  description?: string;
  response?: string;
  createdAt: string;
};

export default function LgpdPage() {
  const [type, setType] = useState("ACCESS");
  const [description, setDescription] = useState("");
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setRequests(await apiRequest<PrivacyRequest[]>("/privacy/requests"));
    } catch {
      setRequests([]);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await apiRequest("/privacy/requests", {
        method: "POST",
        body: JSON.stringify({ type, description })
      });
      setDescription("");
      setMessage("Solicitacao registrada.");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entre na sua conta para registrar a solicitacao.");
    } finally {
      setLoading(false);
    }
  }

  async function exportData() {
    setError("");
    setMessage("");
    try {
      const payload = await apiRequest<Record<string, unknown>>("/privacy/me/export");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "foxtrot-dados-pessoais.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Exportacao gerada no navegador.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entre na sua conta para exportar seus dados.");
    }
  }

  return (
    <LegalPage title="LGPD e direitos do titular" updatedAt="07/08/2026">
      <section>
        <h2>Exercer direitos</h2>
        <p>
          Usuarios autenticados podem exportar dados pessoais e registrar solicitacoes. Pedidos sensiveis, como exclusao ou anonimizacao, entram em revisao operacional antes de qualquer remocao definitiva.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" onClick={exportData} type="button">
            <Download className="h-4 w-4" />
            Exportar dados
          </button>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href="/privacidade">
            <FileText className="h-4 w-4" />
            Privacidade
          </Link>
        </div>
      </section>
      <section>
        <h2>Nova solicitacao</h2>
        <form className="mt-3 grid gap-3" onSubmit={submit}>
          <select className="h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white" onChange={(event) => setType(event.target.value)} value={type}>
            {requestTypes.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <textarea
            className="min-h-28 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            maxLength={1200}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Detalhe sua solicitacao"
            value={description}
          />
          <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 hover:bg-white" disabled={loading} type="submit">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </button>
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </form>
      </section>
      <section>
        <h2>Historico</h2>
        {requests.length ? (
          <div className="grid gap-3">
            {requests.map((item) => (
              <div className="rounded-md border border-zinc-800 p-3" key={item.id}>
                <p className="font-semibold text-white">{item.type} - {item.status}</p>
                <p className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
                {item.description ? <p className="mt-2">{item.description}</p> : null}
                {item.response ? <p className="mt-2 text-emerald-300">{item.response}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p>Entre na sua conta para visualizar o historico de solicitacoes.</p>
        )}
      </section>
    </LegalPage>
  );
}
