"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Flame,
  Layers3,
  ListTodo,
  Plus,
  RotateCcw,
  Star,
  Target
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
  StatCard,
  cn
} from "@foxtrot/ui";
import { StudentNavigation } from "../../components/StudentNavigation";
import {
  PlannerDashboard,
  StudyList,
  TaskPriority,
  calendarDayLabel,
  completeStudyTask,
  consistencyPercent,
  createStudyGoal,
  createStudyList,
  createStudyTask,
  dateInputValue,
  fetchPlannerDashboard,
  formatDuration,
  priorityLabel,
  summarizeGoals,
  summarizeTasks,
  updateStudyGoal
} from "../../lib/productivity";

type Status = { type: "success" | "error"; message: string } | null;

const priorities: TaskPriority[] = ["LOW", "NORMAL", "HIGH", "STARRED"];

export default function PlannerPage() {
  const [dashboard, setDashboard] = useState<PlannerDashboard | null>(null);
  const [activeListId, setActiveListId] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", dueDate: dateInputValue(), priority: "NORMAL" as TaskPriority });
  const [goalForm, setGoalForm] = useState({
    title: "",
    period: "weekly" as "daily" | "weekly" | "custom",
    targetMinutes: "600",
    targetQuestions: "150",
    targetFlashcards: "50"
  });

  useEffect(() => {
    void load();
  }, []);

  const activeList = useMemo(
    () => dashboard?.lists.find((list) => list.id === activeListId) ?? dashboard?.lists[0],
    [dashboard, activeListId]
  );
  const taskSummary = useMemo(() => summarizeTasks(dashboard?.lists ?? []), [dashboard]);
  const goalSummary = useMemo(() => summarizeGoals(dashboard?.goals ?? []), [dashboard]);
  const currentWeek = dashboard?.calendar.slice(0, 7) ?? [];

  async function load() {
    setLoading(true);
    setStatus(null);
    try {
      const next = await fetchPlannerDashboard();
      setDashboard(next);
      setActiveListId((current) => current || next.lists[0]?.id || "");
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel carregar o planejamento." });
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setStatus(null);
    try {
      await action();
      setStatus({ type: "success", message: success });
      await load();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel concluir a acao." });
    } finally {
      setSaving(false);
    }
  }

  async function submitList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      const list = await createStudyList({ title: listTitle.trim() });
      setActiveListId(list.id);
      setListTitle("");
    }, "Lista criada.");
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeList) {
      setStatus({ type: "error", message: "Crie ou selecione uma lista." });
      return;
    }
    await runAction(
      () => createStudyTask(activeList.id, { title: taskForm.title.trim(), dueDate: taskForm.dueDate, priority: taskForm.priority }),
      "Tarefa criada."
    );
    setTaskForm((current) => ({ ...current, title: "" }));
  }

  async function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(
      () =>
        createStudyGoal({
          title: goalForm.title.trim(),
          period: goalForm.period,
          targetNetSeconds: Number(goalForm.targetMinutes || 0) * 60,
          targetQuestions: Number(goalForm.targetQuestions || 0),
          targetFlashcards: Number(goalForm.targetFlashcards || 0)
        }),
      "Meta criada."
    );
    setGoalForm((current) => ({ ...current, title: "" }));
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <StudentNavigation activeHref="/planejamento" />
      <PageHeader
        eyebrow="Produtividade do aluno"
        title="Planejamento"
        description="Organize metas, tarefas, calendario e progresso usando dados reais da sua conta."
        actions={
          <>
            <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href="/foco">
              <Flame className="h-4 w-4" aria-hidden /> Area Foco
            </Link>
            <Button type="button" variant="ghost" onClick={() => void load()}>
              <RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden /> Atualizar
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {status?.type === "error" && <ErrorState description={status.message} action={<Button type="button" variant="outline" onClick={() => void load()}>Tentar novamente</Button>} />}
        {status?.type === "success" && <p className="mb-4 rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-100">{status.message}</p>}

        {loading ? (
          <LoadingState label="Carregando seu planejamento..." />
        ) : dashboard ? (
          <div className="grid gap-6">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={<Flame className="h-4 w-4" aria-hidden />} label="Foco na semana" value={formatDuration(dashboard.consistency.weeklyNetSeconds)} />
              <StatCard icon={<Target className="h-4 w-4" aria-hidden />} label="Questoes" value={String(dashboard.consistency.weeklyQuestions ?? 0)} tone="blue" />
              <StatCard icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} label="Tarefas" value={`${taskSummary.completed}/${taskSummary.total}`} tone="green" />
              <StatCard icon={<Star className="h-4 w-4" aria-hidden />} label="Sequencia" value={`${dashboard.consistency.streakDays} dias`} tone="red" />
              <StatCard icon={<Layers3 className="h-4 w-4" aria-hidden />} label="Flashcards hoje" value={String(dashboard.progress.dueFlashcards)} tone="zinc" />
            </section>

            <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
              <aside className="grid content-start gap-4">
                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Listas</h2>
                  <div className="mt-4 grid gap-2">
                    {dashboard.lists.map((list) => (
                      <button
                        aria-pressed={activeList?.id === list.id}
                        className={cn(
                          "flex min-h-10 items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foxtrot-500",
                          activeList?.id === list.id && "bg-zinc-900 text-white"
                        )}
                        key={list.id}
                        onClick={() => setActiveListId(list.id)}
                        type="button"
                      >
                        <span className="inline-flex items-center gap-2">
                          <ListTodo className="h-4 w-4 text-foxtrot-400" aria-hidden /> {list.title}
                        </span>
                        <Badge tone="neutral">{list.tasks.length}</Badge>
                      </button>
                    ))}
                    {dashboard.lists.length === 0 && <EmptyState title="Sem listas" description="Crie a primeira lista para organizar sua rotina." />}
                  </div>
                  <form className="mt-4 grid gap-3 border-t border-zinc-800 pt-4" onSubmit={submitList}>
                    <Field label="Nova lista" htmlFor="list-title">
                      <Input id="list-title" value={listTitle} onChange={(event) => setListTitle(event.target.value)} />
                    </Field>
                    <Button disabled={saving || !listTitle.trim()} type="submit">
                      <Plus className="h-4 w-4" aria-hidden /> Criar
                    </Button>
                  </form>
                </Card>

                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Consistencia</h2>
                  <p className="mt-1 text-sm text-zinc-400">{consistencyPercent(dashboard.consistency)}% dos dias recentes com atividade.</p>
                  <div className="mt-4 grid grid-cols-7 gap-2" aria-label="Mapa de consistencia">
                    {dashboard.consistency.days.map((day) => (
                      <div key={day.date} title={`${day.date}: ${formatDuration(day.netSeconds)}`} className={cn("h-9 rounded-md border border-zinc-800", day.active ? "bg-foxtrot-500" : "bg-zinc-900")} />
                    ))}
                  </div>
                </Card>
              </aside>

              <section className="grid content-start gap-4">
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-2xl font-black uppercase text-white">{activeList?.title ?? "Tarefas"}</h2>
                      <p className="mt-1 text-sm text-zinc-400">{taskSummary.open} abertas, {taskSummary.dueToday} para hoje e {taskSummary.overdue} atrasadas.</p>
                    </div>
                    {taskSummary.overdue > 0 && <Badge tone="warning"><AlertTriangle className="mr-1 h-3 w-3" aria-hidden /> Atenção</Badge>}
                  </div>

                  <form className="mt-5 grid gap-3 rounded-md border border-zinc-800 bg-zinc-900 p-3 md:grid-cols-[1fr_150px_150px_auto]" onSubmit={submitTask}>
                    <Field label="Tarefa" htmlFor="task-title">
                      <Input id="task-title" value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} />
                    </Field>
                    <Field label="Data" htmlFor="task-date">
                      <Input id="task-date" type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} />
                    </Field>
                    <Field label="Prioridade" htmlFor="task-priority">
                      <Select id="task-priority" value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
                        {priorities.map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
                      </Select>
                    </Field>
                    <Button className="self-end" disabled={saving || !taskForm.title.trim()} type="submit">Adicionar</Button>
                  </form>

                  <div className="mt-5 grid gap-3">
                    {activeList?.tasks.map((task) => (
                      <article key={task.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                        <button
                          aria-label={task.completedAt ? "Reabrir tarefa" : "Concluir tarefa"}
                          className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foxtrot-500"
                          disabled={saving}
                          onClick={() => void runAction(() => completeStudyTask(task.id, !task.completedAt), task.completedAt ? "Tarefa reaberta." : "Tarefa concluida.")}
                          type="button"
                        >
                          <CheckCircle2 className={cn("h-5 w-5", task.completedAt ? "text-emerald-400" : "text-zinc-500")} aria-hidden />
                        </button>
                        <div className="min-w-0">
                          <p className={cn("truncate font-semibold", task.completedAt && "text-zinc-500 line-through")}>{task.title}</p>
                          <p className="mt-1 text-xs uppercase text-zinc-500">{task.dueDate ? calendarDayLabel(task.dueDate) : "Sem data"} / {priorityLabel(task.priority)}</p>
                        </div>
                        <Star className={cn("h-5 w-5", task.priority === "STARRED" ? "fill-orange-500 text-foxtrot-400" : "text-zinc-600")} aria-hidden />
                      </article>
                    ))}
                    {!activeList?.tasks.length && <EmptyState title="Sem tarefas" description="Adicione uma tarefa para guiar a proxima sessao de estudo." />}
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-foxtrot-400" aria-hidden />
                    <h2 className="font-display text-xl font-bold uppercase text-white">Calendario</h2>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-7">
                    {currentWeek.map((day) => (
                      <div key={day.date} className="min-h-28 rounded-md border border-zinc-800 bg-zinc-900 p-3">
                        <p className="font-semibold text-white">{calendarDayLabel(day.date)}</p>
                        <p className="mt-1 text-xs uppercase text-zinc-500">{day.items.length} tarefas</p>
                        <div className="mt-3 grid gap-2">
                          {day.items.slice(0, 3).map((task) => (
                            <span key={task.id} className="truncate rounded bg-zinc-950 px-2 py-1 text-xs text-zinc-300">{task.title}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {currentWeek.length === 0 && <EmptyState title="Calendario vazio" description="As tarefas com data aparecem aqui." />}
                  </div>
                </Card>
              </section>

              <aside className="grid content-start gap-4">
                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Metas</h2>
                  <p className="mt-1 text-sm text-zinc-400">{goalSummary.active} ativas, media de {goalSummary.averageProgress}%.</p>
                  <form className="mt-4 grid gap-3" onSubmit={submitGoal}>
                    <Field label="Titulo" htmlFor="goal-title">
                      <Input id="goal-title" value={goalForm.title} onChange={(event) => setGoalForm((current) => ({ ...current, title: event.target.value }))} />
                    </Field>
                    <Field label="Periodo" htmlFor="goal-period">
                      <Select id="goal-period" value={goalForm.period} onChange={(event) => setGoalForm((current) => ({ ...current, period: event.target.value as "daily" | "weekly" | "custom" }))}>
                        <option value="daily">Diaria</option>
                        <option value="weekly">Semanal</option>
                        <option value="custom">Personalizada</option>
                      </Select>
                    </Field>
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Min" htmlFor="goal-minutes">
                        <Input id="goal-minutes" min="0" type="number" value={goalForm.targetMinutes} onChange={(event) => setGoalForm((current) => ({ ...current, targetMinutes: event.target.value }))} />
                      </Field>
                      <Field label="Quest." htmlFor="goal-questions">
                        <Input id="goal-questions" min="0" type="number" value={goalForm.targetQuestions} onChange={(event) => setGoalForm((current) => ({ ...current, targetQuestions: event.target.value }))} />
                      </Field>
                      <Field label="Cards" htmlFor="goal-flashcards">
                        <Input id="goal-flashcards" min="0" type="number" value={goalForm.targetFlashcards} onChange={(event) => setGoalForm((current) => ({ ...current, targetFlashcards: event.target.value }))} />
                      </Field>
                    </div>
                    <Button disabled={saving || !goalForm.title.trim()} type="submit">Criar meta</Button>
                  </form>
                  <div className="mt-5 grid gap-3">
                    {dashboard.goals.map((goal) => {
                      const percent = Math.min(100, Math.max(0, goal.progress?.percent ?? 0));
                      return (
                        <article key={goal.id} className="rounded-md border border-zinc-800 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-white">{goal.title}</h3>
                              <p className="mt-1 text-xs uppercase text-zinc-500">{goal.period} / {percent}%</p>
                            </div>
                            {goal.completedAt ? <Badge tone="success">Concluida</Badge> : <Button size="sm" type="button" variant="ghost" onClick={() => void runAction(() => updateStudyGoal(goal.id, { completed: true }), "Meta concluida.")}>Fechar</Button>}
                          </div>
                          <div className="mt-3 h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-foxtrot-500" style={{ width: `${percent}%` }} /></div>
                        </article>
                      );
                    })}
                    {dashboard.goals.length === 0 && <EmptyState title="Sem metas" description="Crie metas de tempo, questoes ou flashcards." />}
                  </div>
                </Card>

                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Progresso e favoritos</h2>
                  <div className="mt-4 grid gap-3 text-sm">
                    <p className="rounded border border-zinc-800 p-3 text-zinc-300">Flashcards favoritos: <strong className="text-white">{dashboard.progress.favoriteFlashcards}</strong></p>
                    {dashboard.progress.favoriteQuestions.slice(0, 3).map((favorite) => (
                      <Link className="rounded border border-zinc-800 p-3 text-zinc-300 hover:bg-zinc-900" href="/questoes" key={favorite.id}>
                        <strong className="block text-white">{favorite.question.code}</strong>
                        <span className="line-clamp-2">{favorite.question.statement}</span>
                      </Link>
                    ))}
                    {dashboard.progress.recentLessons.slice(0, 3).map((progress) => (
                      <Link className="rounded border border-zinc-800 p-3 text-zinc-300 hover:bg-zinc-900" href={`/aulas/${progress.id}`} key={progress.id}>
                        <strong className="block text-white">{progress.lesson.title}</strong>
                        <span>{progress.lesson.module.course.title} / {formatDuration(progress.watchedSeconds)}</span>
                      </Link>
                    ))}
                    {dashboard.progress.favoriteQuestions.length === 0 && dashboard.progress.recentLessons.length === 0 && (
                      <p className="text-zinc-500">Favoritos e aulas recentes aparecem conforme voce estuda.</p>
                    )}
                  </div>
                </Card>
              </aside>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
