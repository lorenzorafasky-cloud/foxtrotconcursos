import { AlertTriangle, Bot, Database, FileText, ShieldCheck, UploadCloud, Users, Video } from "lucide-react";
import { BrandMark, Button, StatCard } from "@foxtrot/ui";

export default function AdminHome() {
  const queues = ["Transcricao de video", "Resumo por IA", "Thumbnail", "Recalculo de ranking"];
  const audit = ["impersonation iniciado", "gabarito corrigido", "flag live classes alterada"];

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandMark />
          <Button><ShieldCheck className="h-4 w-4" /> Ala administrativa</Button>
        </div>
      </header>
      <section className="relative border-b border-zinc-800">
        <img
          alt="Painel administrativo"
          className="absolute inset-0 h-full w-full object-cover opacity-14"
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8">
          <h1 className="font-display text-4xl font-black uppercase text-white">Comando da plataforma</h1>
          <p className="mt-2 max-w-2xl text-zinc-300">
            Controle conteudo, subcontas, IA, auditoria, pagamentos e infraestrutura operacional.
          </p>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">
        <section className="grid gap-4 md:grid-cols-2">
          <StatCard icon={<Users className="h-4 w-4" />} label="Usuarios" value="1.284" />
          <StatCard icon={<Video className="h-4 w-4" />} label="Aulas publicadas" value="356" />
          <StatCard icon={<Database className="h-4 w-4" />} label="Questoes" value="18.420" />
          <StatCard icon={<Bot className="h-4 w-4" />} label="Jobs de IA" value="42 hoje" tone="red" />
          <article className="rounded-md border border-zinc-800 bg-zinc-950 p-5 md:col-span-2">
            <h2 className="font-display text-2xl font-bold uppercase">Publicacao de aula</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {queues.map((queue) => (
                <span key={queue} className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
                  {queue}
                </span>
              ))}
            </div>
            <Button className="mt-5"><UploadCloud className="h-4 w-4" /> Enviar video</Button>
          </article>
        </section>
        <aside className="grid gap-4">
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase">Auditoria sensivel</h2>
            <div className="mt-4 grid gap-3">
              {audit.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded border border-zinc-800 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  {item}
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase">Feature flags</h2>
            <p className="mt-2 text-sm text-zinc-400">Psicologia, apoio mental, recreio e aulas ao vivo desligadas por padrao.</p>
            <Button className="mt-4" variant="ghost"><FileText className="h-4 w-4" /> Ver flags</Button>
          </section>
        </aside>
      </div>
    </main>
  );
}
