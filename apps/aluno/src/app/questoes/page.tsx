import { Brain, Filter, MessageSquareText, NotebookPen, Search, Sparkles, Timer } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";

export default function QuestionsPage() {
  const filters = ["Banca", "Carreira", "Materia", "Assunto", "Ano", "Instituicao", "Cargo", "Codigo"];
  const answers = ["Alunos", "Professor", "IA"];

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandMark />
          <Button><Search className="h-4 w-4" /> Buscar questoes</Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <h1 className="font-display text-2xl font-bold uppercase text-white">Banco de questoes</h1>
          <div className="mt-5 grid gap-3">
            {filters.map((filter) => (
              <button key={filter} className="flex h-10 items-center justify-between rounded border border-zinc-800 px-3 text-left text-sm text-zinc-300">
                {filter}
                <Filter className="h-4 w-4 text-foxtrot-400" />
              </button>
            ))}
          </div>
        </aside>
        <section className="grid gap-4">
          <article className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase text-zinc-500">
              <span>FOX-DCON-0001</span>
              <span>CESPE</span>
              <span>Direito Constitucional</span>
            </div>
            <p className="mt-4 text-lg text-white">
              A inviolabilidade domiciliar admite ingresso sem consentimento do morador em caso de flagrante delito.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Button variant="ghost">Certo</Button>
              <Button variant="ghost">Errado</Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-2"><Timer className="h-4 w-4" /> 1m12s medio</span>
              <span className="inline-flex items-center gap-2"><Brain className="h-4 w-4" /> Dificuldade media</span>
              <span className="inline-flex items-center gap-2"><NotebookPen className="h-4 w-4" /> Anotacoes</span>
            </div>
          </article>
          <section className="grid gap-4 md:grid-cols-3">
            {answers.map((answer) => (
              <article key={answer} className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase text-white">
                  {answer === "IA" ? <Sparkles className="h-4 w-4 text-foxtrot-400" /> : <MessageSquareText className="h-4 w-4 text-foxtrot-400" />}
                  {answer}
                </h2>
                <p className="mt-3 text-sm text-zinc-400">
                  {answer === "Professor"
                    ? "Resposta oficial vinculada ao professor da materia."
                    : answer === "IA"
                      ? "Resposta gerada sob demanda e cacheada por questao."
                      : "Thread colaborativa com upvotes dos alunos."}
                </p>
              </article>
            ))}
          </section>
        </section>
      </div>
    </main>
  );
}
