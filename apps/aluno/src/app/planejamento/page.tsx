"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, Flame, Layers3, ListTodo, Loader2, Plus, RotateCcw, Star, Target, Trophy } from "lucide-react";
import { BrandMark, Button, StatCard, cn } from "@foxtrot/ui";
import {
  PlannerDashboard,
  StudyList,
  TaskPriority,
  completeStudyTask,
  createStudyGoal,
  createStudyList,
  createStudyTask,
  dateInputValue,
  fetchPlannerDashboard,
  formatDuration,
  updateStudyGoal
} from "../../lib/productivity";

export default function PlannerPage() {
  const [dashboard, setDashboard] = useState<PlannerDashboard | null>(null);
  const [activeListId, setActiveListId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: dateInputValue(), priority: "NORMAL" as TaskPriority });
  const [goalForm, setGoalForm] = useState({ title: "", period: "weekly" as "daily" | "weekly" | "custom", targetMinutes: "600", targetQuestions: "150", targetFlashcards: "50" });

  useEffect(() => {
    void load();
  }, []);

  const activeList = useMemo(
    () => dashboard?.lists.find((list) => list.id === activeListId) ?? dashboard?.lists[0],
    [dashboard, activeListId]
  );

  async function load() {
    setLoading(true);
    setStatus("");
    try {
      const next = await fetchPlannerDashboard();
      setDashboard(next);
      setActiveListId((current) => current || next.lists[0]?.id || "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar o planejamento.");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setStatus("");
    try {
      await action();
      setStatus(success);
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel concluir a acao.");
    } finally {
      setSaving(false);
    }
  }

  async function submitList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      const list = await createStudyList({ title: listTitle });
      setActiveListId(list.id);
      setListTitle("");
    }, "Lista criada.");
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeList) return setStatus("Crie ou selecione uma lista.");
    await runAction(
      () => createStudyTask(activeList.id, { title: taskForm.title, dueDate: taskForm.dueDate, priority: taskForm.priority }),
      "Tarefa criada."
    );
    setTaskForm((current) => ({ ...current, title: "" }));
  }

  async function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(
      () =>
        createStudyGoal({
          title: goalForm.title,
          period: goalForm.period,
          targetNetSeconds: Number(goalForm.targetMinutes) * 60,
          targetQuestions: Number(goalForm.targetQuestions),
          targetFlashcards: Number(goalForm.targetFlashcards)
        }),
      "Meta criada."
    );
    setGoalForm((current) => ({ ...current, title: "" }));
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <Link href="/"><BrandMark /></Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/foco"><Flame className="h-4 w-4" /> Area Foco</Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/gamificacao"><Trophy className="h-4 w-4" /> Ranking</Link>
            <Button type="button" variant="ghost" onClick={() => void load()}><RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} /> Atualizar</Button>
          </div>
        </div>
      </header>

      <section className="border-b border-zinc-800">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-foxtrot-300">Metas e tarefas</p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase text-white">Planejamento</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Flame className="h-4 w-4" />} label="Foco na semana" value={formatDuration(dashboard?.consistency.weeklyNetSeconds ?? 0)} />
            <StatCard icon={<Target className="h-4 w-4" />} label="Questoes na semana" value={String(dashboard?.consistency.weeklyQuestions ?? 0)} />
            <StatCard icon={<Star className="h-4 w-4" />} label="Sequencia" value={`${dashboard?.consistency.streakDays ?? 0} dias`} tone="red" />
            <StatCard icon={<Layers3 className="h-4 w-4" />} label="Flashcards hoje" value={String(dashboard?.progress.dueFlashcards ?? 0)} tone="zinc" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {status && <p className="mb-4 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">{status}</p>}
        {loading ? (
          <Empty text="Carregando planejamento." />
        ) : dashboard ? (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr_360px]">
            <aside className="grid content-start gap-4">
              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                <h2 className="font-display text-2xl font-bold uppercase text-white">Listas de estudo</h2>
                <div className="mt-4 grid gap-2">
                  {dashboard.lists.map((list) => (
                    <button key={list.id} type="button" onClick={() => setActiveListId(list.id)} className={cn("flex h-10 items-center gap-2 rounded px-3 text-left text-sm text-zinc-300 hover:bg-zinc-900", activeList?.id === list.id && "bg-zinc-900 text-white")}>
                      <ListTodo className="h-4 w-4 text-foxtrot-400" /> {list.title}
                    </button>
                  ))}
                </div>
                <form className="mt-4 grid gap-2 border-t border-zinc-800 pt-4" onSubmit={submitList}>
                  <TextInput label="Nova lista" value={listTitle} onChange={setListTitle} />
                  <Button disabled={saving || !listTitle.trim()} type="submit"><Plus className="h-4 w-4" /> Criar</Button>
                </form>
              </section>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                <h2 className="font-display text-lg font-bold uppercase text-white">Consistencia</h2>
                <div className="mt-4 grid grid-cols-7 gap-2">
                  {dashboard.consistency.days.map((day) => (
                    <div key={day.date} title={day.date} className={cn("h-9 rounded-md border border-zinc-800", day.active ? "bg-foxtrot-500" : "bg-zinc-900")} />
                  ))}
                </div>
              </section>
            </aside>

            <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl font-black uppercase text-white">{activeList?.title ?? "Sem lista"}</h2>
                  <p className="text-sm text-zinc-400">Tarefas, prioridades e calendario conectados ao seu progresso.</p>
                </div>
                <CalendarClock className="h-6 w-6 text-foxtrot-400" />
              </div>

              <form className="mt-6 grid gap-3 rounded-md border border-zinc-800 bg-zinc-900 p-3 md:grid-cols-[1fr_150px_140px_auto]" onSubmit={submitTask}>
                <TextInput label="Tarefa" value={taskForm.title} onChange={(title) => setTaskForm((current) => ({ ...current, title }))} />
                <TextInput label="Data" type="date" value={taskForm.dueDate} onChange={(dueDate) => setTaskForm((current) => ({ ...current, dueDate }))} />
                <Select label="Prioridade" value={taskForm.priority} items={["LOW", "NORMAL", "HIGH", "STARRED"].map((item) => ({ id: item, name: item }))} onChange={(priority) => setTaskForm((current) => ({ ...current, priority: priority as TaskPriority }))} />
                <Button className="self-end" disabled={saving || !taskForm.title.trim()} type="submit">Adicionar</Button>
              </form>

              <div className="mt-6 grid gap-3">
                {activeList?.tasks.map((task) => (
                  <article key={task.id} className="grid grid-cols-[28px_1fr_28px] items-center gap-3 rounded-md border border-zinc-800 p-3">
                    <button type="button" onClick={() => void runAction(() => completeStudyTask(task.id, !task.completedAt), task.completedAt ? "Tarefa reaberta." : "Tarefa concluida.")}>
                      <CheckCircle2 className={cn("h-5 w-5", task.completedAt ? "text-emerald-400" : "text-zinc-500")} />
                    </button>
                    <div>
                      <p className={cn("font-semibold", task.completedAt && "text-zinc-500 line-through")}>{task.title}</p>
                      <p className="text-xs uppercase text-zinc-500">{task.dueDate ? task.dueDate.slice(0, 10) : "Sem data"} / {task.priority}</p>
                    </div>
                    <Star className={cn("h-5 w-5", task.priority === "STARRED" ? "fill-orange-500 text-foxtrot-400" : "text-zinc-600")} />
                  </article>
                ))}
                {!activeList?.tasks.length && <Empty text="Nenhuma tarefa nesta lista." />}
              </div>
            </section>

            <aside className="grid content-start gap-4">
              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                <h2 className="font-display text-lg font-bold uppercase text-white">Metas</h2>
                <form className="mt-4 grid gap-3" onSubmit={submitGoal}>
                  <TextInput label="Titulo" value={goalForm.title} onChange={(title) => setGoalForm((current) => ({ ...current, title }))} />
                  <Select label="Periodo" value={goalForm.period} items={[{ id: "daily", name: "Diaria" }, { id: "weekly", name: "Semanal" }, { id: "custom", name: "Personalizada" }]} onChange={(period) => setGoalForm((current) => ({ ...current, period: period as "daily" | "weekly" | "custom" }))} />
                  <div className="grid grid-cols-3 gap-2">
                    <TextInput label="Min" value={goalForm.targetMinutes} onChange={(targetMinutes) => setGoalForm((current) => ({ ...current, targetMinutes }))} />
                    <TextInput label="Quest." value={goalForm.targetQuestions} onChange={(targetQuestions) => setGoalForm((current) => ({ ...current, targetQuestions }))} />
                    <TextInput label="Cards" value={goalForm.targetFlashcards} onChange={(targetFlashcards) => setGoalForm((current) => ({ ...current, targetFlashcards }))} />
                  </div>
                  <Button disabled={saving || !goalForm.title.trim()} type="submit">Criar meta</Button>
                </form>
                <div className="mt-5 grid gap-3">
                  {dashboard.goals.map((goal) => (
                    <article key={goal.id} className="rounded-md border border-zinc-800 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">{goal.title}</h3>
                          <p className="text-xs uppercase text-zinc-500">{goal.period} / {goal.progress?.percent ?? 0}%</p>
                        </div>
                        {!goal.completedAt && <Button type="button" variant="ghost" onClick={() => void runAction(() => updateStudyGoal(goal.id, { completed: true }), "Meta concluida.")}>Fechar</Button>}
                      </div>
                      <div className="mt-3 h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-foxtrot-500" style={{ width: `${goal.progress?.percent ?? 0}%` }} /></div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                <h2 className="font-display text-lg font-bold uppercase text-white">Calendario</h2>
                <div className="mt-4 grid gap-2">
                  {dashboard.calendar.slice(0, 8).map((day) => (
                    <div key={day.date} className="rounded border border-zinc-800 p-3 text-sm">
                      <p className="font-semibold text-white">{day.date}</p>
                      <p className="text-zinc-400">{day.items.length} tarefas</p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function TextInput({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase text-zinc-500">
      {label}
      <input className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-orange-500" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, items, onChange }: { label: string; value: string; items: Array<{ id: string; name: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase text-zinc-500">
      {label}
      <select className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-orange-500" value={value} onChange={(event) => onChange(event.target.value)}>
        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">{text}</p>;
}
