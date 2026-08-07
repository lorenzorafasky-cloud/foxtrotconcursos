import { Bot, Download, FileQuestion, MessageSquareText, Star } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";

export default function LessonPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandMark />
          <Button><Download className="h-4 w-4" /> Baixar slide</Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="aspect-video rounded-md border border-zinc-800 bg-black">
            <div className="flex h-full items-center justify-center">
              <Button>Player Cloudflare Stream</Button>
            </div>
          </div>
          <div className="mt-5 rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h1 className="font-display text-3xl font-black uppercase text-white">Direitos fundamentais em operacao</h1>
            <p className="mt-2 text-zinc-400">Degravacao sincronizada, resumo por IA e caderno automatico por assunto.</p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <Star key={score} className="h-5 w-5 text-foxtrot-400" />
              ))}
            </div>
          </div>
        </section>
        <aside className="grid gap-4">
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
              <Bot className="h-5 w-5 text-foxtrot-400" /> Agente de IA
            </h2>
            <p className="mt-3 text-sm text-zinc-400">Responde somente com contexto da transcricao desta aula.</p>
          </section>
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
              <MessageSquareText className="h-5 w-5 text-foxtrot-400" /> Duvidas
            </h2>
            <p className="mt-3 text-sm text-zinc-400">Perguntas seguem para o professor responsavel pela materia.</p>
          </section>
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
              <FileQuestion className="h-5 w-5 text-foxtrot-400" /> Caderno
            </h2>
            <p className="mt-3 text-sm text-zinc-400">Questoes filtradas por direitos fundamentais.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
