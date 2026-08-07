"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, BrainCircuit, History, Loader2, Search, Sparkles } from "lucide-react";
import { BrandMark, Button, StatCard } from "@foxtrot/ui";
import { AiSearchResponse, AiUsage, askStudySupport, fetchAiUsage, formatCost, smartSearch } from "../../lib/ai";

export default function AiPage() {
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [searchResult, setSearchResult] = useState<AiSearchResponse | null>(null);
  const [supportAnswer, setSupportAnswer] = useState("");
  const [usage, setUsage] = useState<AiUsage[]>([]);
  const [status, setStatus] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSupport, setLoadingSupport] = useState(false);

  useEffect(() => {
    void loadUsage();
  }, []);

  async function loadUsage() {
    try {
      setUsage(await fetchAiUsage());
    } catch {
      setUsage([]);
    }
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingSearch(true);
    setStatus("");
    try {
      setSearchResult(await smartSearch(query, true));
      await loadUsage();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel buscar com IA.");
    } finally {
      setLoadingSearch(false);
    }
  }

  async function submitSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingSupport(true);
    setStatus("");
    try {
      const result = await askStudySupport({ question });
      setSupportAnswer(result.answer);
      await loadUsage();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel consultar o apoio de estudo.");
    } finally {
      setLoadingSupport(false);
    }
  }

  const totalCost = usage.reduce((sum, item) => sum + item.costCents, 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/"><BrandMark /></Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/questoes"><Search className="h-4 w-4" /> Questoes</Link>
        </div>
      </header>

      <section className="border-b border-zinc-800">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-foxtrot-300">IA e automacoes</p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase text-white">Inteligencia de estudo</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard icon={<Bot className="h-4 w-4" />} label="Consultas" value={String(usage.length)} />
            <StatCard icon={<History className="h-4 w-4" />} label="Custo registrado" value={formatCost(totalCost)} tone="zinc" />
            <StatCard icon={<Sparkles className="h-4 w-4" />} label="Modo" value="Seguro" tone="red" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <section className="grid gap-6">
          {status && <p className="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">{status}</p>}

          <form className="rounded-md border border-zinc-800 bg-zinc-950 p-5" onSubmit={submitSearch}>
            <h1 className="font-display text-2xl font-black uppercase text-white">Busca inteligente</h1>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input className="h-11 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-orange-500" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque aulas, questoes, cursos e notas" />
              <Button disabled={loadingSearch || query.trim().length < 2} type="submit">{loadingSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />} Buscar</Button>
            </div>
          </form>

          {searchResult && (
            <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              {searchResult.answer && <p className="mb-4 rounded bg-zinc-900 p-4 text-sm text-zinc-300">{searchResult.answer}</p>}
              <div className="grid gap-3">
                {searchResult.results.map((item) => (
                  <Link key={`${item.type}-${item.id}`} href={item.url} className="rounded border border-zinc-800 p-4 hover:border-foxtrot-500">
                    <span className="text-xs uppercase text-zinc-500">{item.type}</span>
                    <strong className="mt-1 block text-white">{item.title}</strong>
                    <span className="mt-2 line-clamp-2 block text-sm text-zinc-400">{item.excerpt}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <form className="rounded-md border border-zinc-800 bg-zinc-950 p-5" onSubmit={submitSupport}>
            <h2 className="font-display text-2xl font-black uppercase text-white">Apoio ao estudo</h2>
            <textarea className="mt-4 min-h-32 w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-white outline-none focus:border-orange-500" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Explique sua duvida com contexto." />
            <Button className="mt-3" disabled={loadingSupport || question.trim().length < 5} type="submit">{loadingSupport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} Perguntar</Button>
          </form>

          {supportAnswer && <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5 text-sm leading-6 text-zinc-300 whitespace-pre-wrap">{supportAnswer}</section>}
        </section>

        <aside className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="font-display text-xl font-bold uppercase text-white">Uso recente</h2>
          <div className="mt-4 grid gap-2">
            {usage.map((item) => (
              <p key={item.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">{item.feature} / {formatCost(item.costCents)}</p>
            ))}
            {usage.length === 0 && <p className="text-sm text-zinc-500">Nenhum uso registrado.</p>}
          </div>
        </aside>
      </div>
    </main>
  );
}
