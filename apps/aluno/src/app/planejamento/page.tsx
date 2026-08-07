import { CalendarClock, CheckCircle2, ListTodo, Plus, Star } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";

export default function PlannerPage() {
  const tasks = [
    { title: "Resolver 30 questoes de Constitucional", starred: true },
    { title: "Revisar aula de direitos fundamentais", starred: false },
    { title: "Flashcards de direitos sociais", starred: false }
  ];

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandMark />
          <Button><Plus className="h-4 w-4" /> Nova tarefa</Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
          <h1 className="font-display text-2xl font-bold uppercase">Planejamento</h1>
          <div className="mt-5 grid gap-2">
            {["Meu Dia", "Importante", "Semana PF", "Revisoes"].map((item) => (
              <button key={item} className="flex h-10 items-center gap-2 rounded px-3 text-left text-sm text-zinc-300 hover:bg-zinc-900">
                <ListTodo className="h-4 w-4 text-foxtrot-400" /> {item}
              </button>
            ))}
          </div>
        </aside>
        <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-3xl font-black uppercase text-white">Meu Dia</h2>
              <p className="text-sm text-zinc-400">Tarefas inspiradas no fluxo Microsoft To Do.</p>
            </div>
            <CalendarClock className="h-6 w-6 text-foxtrot-400" />
          </div>
          <div className="mt-6 grid gap-3">
            {tasks.map((task) => (
              <div key={task.title} className="grid grid-cols-[24px_1fr_24px] items-center gap-3 rounded border border-zinc-800 p-3">
                <CheckCircle2 className="h-5 w-5 text-zinc-500" />
                <span>{task.title}</span>
                {task.starred ? <Star className="h-5 w-5 fill-orange-500 text-foxtrot-400" /> : <Star className="h-5 w-5 text-zinc-600" />}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
