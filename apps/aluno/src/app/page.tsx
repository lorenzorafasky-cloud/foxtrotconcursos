import { BookOpen, CheckCircle2, Clock, Flame, Play, Search, Star, Target, Trophy } from "lucide-react";
import { BrandMark, Button, OperationsStrip, StatCard } from "@foxtrot/ui";

export default function StudentHome() {
  const tasks = ["Resolver 30 questoes CESPE", "Revisar direitos fundamentais", "Pomodoro de Constitucional"];
  const questions = ["FOX-DCON-0001", "FOX-PORT-0042", "FOX-RLM-0014"];

  return (
    <main className="min-h-screen bg-zinc-950">
      <nav className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <BrandMark />
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost"><Search className="h-4 w-4" /> Cursos</Button>
            <Button variant="ghost"><Target className="h-4 w-4" /> Questoes</Button>
            <Button variant="ghost"><Clock className="h-4 w-4" /> Foco</Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-zinc-800">
        <img
          alt="Sala de estudo operacional"
          className="absolute inset-0 h-full w-full object-cover opacity-18"
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop"
        />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-3 font-display text-sm font-bold uppercase text-foxtrot-400">Central de operacoes</p>
            <h1 className="max-w-3xl font-display text-5xl font-black uppercase leading-none text-white md:text-6xl">
              Foxtrot Concursos
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-zinc-300">
              Continue sua preparacao com aulas, questoes comentadas, planejamento e foco em uma rotina unica.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button><Play className="h-4 w-4" /> Retomar aula</Button>
              <Button variant="secondary"><Flame className="h-4 w-4" /> Iniciar foco</Button>
            </div>
          </div>
          <div className="grid gap-3">
            <StatCard icon={<Trophy className="h-4 w-4" />} label="Patente" value="Cabo" />
            <StatCard icon={<Flame className="h-4 w-4" />} label="Ofensiva" value="12 dias" tone="red" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <section>
          <OperationsStrip />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="font-display text-2xl font-bold uppercase text-white">Curso em andamento</h2>
              <p className="mt-2 text-zinc-400">Operacao PF - Pos-edital</p>
              <div className="mt-5 h-2 rounded bg-zinc-800">
                <div className="h-2 w-2/3 rounded bg-foxtrot-500" />
              </div>
              <Button className="mt-5"><BookOpen className="h-4 w-4" /> Abrir trilha</Button>
            </article>
            <article className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="font-display text-2xl font-bold uppercase text-white">Raio-X</h2>
              <p className="mt-2 text-zinc-400">Constitucional esta 18% acima da media do seu grupo.</p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                <span className="rounded bg-zinc-900 p-3">82% acerto</span>
                <span className="rounded bg-zinc-900 p-3">1m12s</span>
                <span className="rounded bg-zinc-900 p-3">Top 8%</span>
              </div>
            </article>
          </div>
        </section>

        <aside className="grid gap-4">
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase">Meu Dia</h2>
            <div className="mt-4 grid gap-3">
              {tasks.map((task) => (
                <div key={task} className="flex items-center gap-3 rounded border border-zinc-800 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-foxtrot-400" />
                  <span>{task}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase">Favoritadas</h2>
            <div className="mt-4 grid gap-2">
              {questions.map((code) => (
                <span key={code} className="inline-flex items-center gap-2 text-sm text-zinc-300">
                  <Star className="h-4 w-4 text-foxtrot-400" /> {code}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
