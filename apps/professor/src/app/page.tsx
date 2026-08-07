import { BookMarked, CheckCircle2, FilePenLine, MessageSquareText, UploadCloud, Video } from "lucide-react";
import { BrandMark, Button, StatCard } from "@foxtrot/ui";

export default function ProfessorHome() {
  const queue = ["Responder questao FOX-DCON-0001", "Corrigir discursiva de direitos fundamentais", "Validar resumo de aula"];

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandMark />
          <Button><UploadCloud className="h-4 w-4" /> Publicar aula</Button>
        </div>
      </header>
      <section className="relative border-b border-zinc-800">
        <img
          alt="Estudio de gravacao"
          className="absolute inset-0 h-full w-full object-cover opacity-16"
          src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1600&auto=format&fit=crop"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8">
          <h1 className="font-display text-4xl font-black uppercase text-white">Painel do instrutor</h1>
          <p className="mt-2 max-w-2xl text-zinc-300">
            Responda alunos, publique aulas e corrija discursivas dentro do escopo da sua materia.
          </p>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon={<MessageSquareText className="h-4 w-4" />} label="Duvidas abertas" value="18" />
          <StatCard icon={<FilePenLine className="h-4 w-4" />} label="Discursivas" value="7" tone="red" />
          <StatCard icon={<Video className="h-4 w-4" />} label="Aulas no ar" value="64" />
          <article className="rounded-md border border-zinc-800 bg-zinc-950 p-5 md:col-span-3">
            <h2 className="font-display text-2xl font-bold uppercase">Fila operacional</h2>
            <div className="mt-4 grid gap-3">
              {queue.map((item) => (
                <div key={item} className="flex items-center justify-between rounded border border-zinc-800 p-3">
                  <span className="flex items-center gap-3 text-sm"><CheckCircle2 className="h-4 w-4 text-foxtrot-400" /> {item}</span>
                  <Button variant="ghost">Abrir</Button>
                </div>
              ))}
            </div>
          </article>
        </section>
        <aside className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="font-display text-xl font-bold uppercase">Material didatico</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Slides, PDFs, cadernos de questoes e respostas oficiais ficam vinculados a materia e assunto.
          </p>
          <Button className="mt-5"><BookMarked className="h-4 w-4" /> Editar material</Button>
        </aside>
      </div>
    </main>
  );
}
