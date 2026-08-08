"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotebookPen, Search } from "lucide-react";
import { Button, useAuthSession } from "@foxtrot/ui";
import {
  fetchNotes,
  fetchQuestionFilters,
  type QuestionFilters,
  type QuestionNote
} from "../../../lib/questions";

/**
 * Area central de anotacoes da Secao 8: tudo que o aluno anotou durante a
 * resolucao de questoes, buscavel por materia/assunto/texto. Tambem acessivel
 * no subdominio questoes.* (multi-zone).
 */
export default function AnotacoesPage() {
  const session = useAuthSession();
  const [notes, setNotes] = useState<QuestionNote[]>([]);
  const [filters, setFilters] = useState<QuestionFilters | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (session.status !== "authenticated") return;
    void fetchQuestionFilters().then(setFilters).catch(() => undefined);
    void reload();
  }, [session.status]);

  async function reload() {
    setLoading(true);
    setMessage("");
    try {
      setNotes(await fetchNotes({ subjectId: subjectId || undefined, topicId: topicId || undefined, q: query || undefined }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar anotacoes.");
    } finally {
      setLoading(false);
    }
  }

  const subject = filters?.subjects.find((item) => item.id === subjectId);

  if (session.status === "anonymous") {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-zinc-400">
          Entre na sua conta para ver suas anotacoes. <Link className="text-foxtrot-300" href="/login?next=/questoes/anotacoes">Fazer login</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-5xl content-start gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-sm font-bold uppercase text-foxtrot-400">Banco de questoes</p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase text-white">Anotacoes</h1>
          <p className="mt-2 text-sm text-zinc-400">Tudo que voce anotou resolvendo questoes, em um so lugar.</p>
        </div>
        <NotebookPen className="h-8 w-8 text-foxtrot-400" aria-hidden />
      </header>

      <form
        className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-[2fr_1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void reload();
        }}
      >
        <input
          className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-sm text-zinc-100"
          placeholder="Buscar por titulo ou conteudo"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-sm text-zinc-100"
          value={subjectId}
          onChange={(event) => {
            setSubjectId(event.target.value);
            setTopicId("");
          }}
        >
          <option value="">Todas as materias</option>
          {filters?.subjects.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-sm text-zinc-100"
          disabled={!subject}
          value={topicId}
          onChange={(event) => setTopicId(event.target.value)}
        >
          <option value="">Todos os assuntos</option>
          {subject?.topics.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <Button disabled={loading} type="submit">
          <Search className="h-4 w-4" /> Filtrar
        </Button>
      </form>

      {message && <p className="text-sm text-red-400">{message}</p>}

      <section className="grid gap-3">
        {!loading && notes.length === 0 && (
          <p className="rounded-md border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-500">
            Nenhuma anotacao encontrada. Anote durante a resolucao de questoes e tudo aparece aqui.
          </p>
        )}
        {notes.map((note) => (
          <article key={note.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-semibold text-white">{note.title}</h2>
              <time className="text-xs text-zinc-500">{new Date(note.updatedAt).toLocaleDateString("pt-BR")}</time>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-300">{note.body}</p>
            {note.question && (
              <p className="mt-3 rounded bg-zinc-900 p-2 text-xs text-zinc-500">
                Questao {note.question.code}: {note.question.statement.slice(0, 140)}...
              </p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
