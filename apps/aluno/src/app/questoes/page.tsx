"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Heart,
  History,
  Loader2,
  RotateCcw,
  Search,
  Send,
  Star,
  Target,
  XCircle
} from "lucide-react";
import { BrandMark, Button, StatCard, cn } from "@foxtrot/ui";
import {
  AttemptHistory,
  PerformanceSubject,
  QuestionDetail,
  QuestionFilters,
  QuestionSearch,
  QuestionSummary,
  SimulationDetail,
  SimulationListItem,
  SimulationResults,
  answerSimulationQuestion,
  createSimulation,
  fetchHistory,
  fetchPerformance,
  fetchQuestionDetail,
  fetchQuestionFilters,
  fetchQuestions,
  fetchReviewErrors,
  fetchSimulation,
  fetchSimulations,
  kindLabel,
  parseAlternatives,
  setQuestionFavorite,
  submitQuestionAttempt,
  submitSimulation
} from "../../lib/questions";

type Tab = "banco" | "simulados" | "revisao";

const emptyFilters: QuestionSearch = {
  q: "",
  boardId: "",
  careerId: "",
  subjectId: "",
  topicId: "",
  year: "",
  yearFrom: "",
  yearTo: "",
  institutionId: "",
  positionId: "",
  code: "",
  kind: "",
  answered: "",
  favorite: false,
  hasExplanation: false
};

export default function QuestionsPage() {
  const [tab, setTab] = useState<Tab>("banco");
  const [catalogFilters, setCatalogFilters] = useState<QuestionFilters | null>(null);
  const [filters, setFilters] = useState<QuestionSearch>(emptyFilters);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<QuestionDetail | null>(null);
  const [answer, setAnswer] = useState("");
  const [discursiveAnswer, setDiscursiveAnswer] = useState("");
  const [startedAt, setStartedAt] = useState(Date.now());
  const [performance, setPerformance] = useState<PerformanceSubject[]>([]);
  const [history, setHistory] = useState<AttemptHistory[]>([]);
  const [reviewErrors, setReviewErrors] = useState<AttemptHistory[]>([]);
  const [simulations, setSimulations] = useState<SimulationListItem[]>([]);
  const [activeSimulation, setActiveSimulation] = useState<SimulationDetail | null>(null);
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [simulationAnswers, setSimulationAnswers] = useState<Record<string, string>>({});
  const [simulationTitle, setSimulationTitle] = useState("Simulado personalizado");
  const [simulationCount, setSimulationCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void load();
  }, []);

  const selectedSubject = useMemo(
    () => catalogFilters?.subjects.find((subject) => subject.id === filters.subjectId),
    [catalogFilters, filters.subjectId]
  );

  const totals = useMemo(() => {
    const attempts = history.length;
    const correct = history.filter((item) => item.isCorrect === true).length;
    const pending = history.filter((item) => item.isCorrect === null).length;
    return {
      attempts,
      correct,
      pending,
      accuracy: attempts - pending > 0 ? Math.round((correct / (attempts - pending)) * 100) : 0
    };
  }, [history]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [loadedFilters, loadedQuestions, loadedPerformance, loadedHistory, loadedReview, loadedSimulations] = await Promise.all([
        fetchQuestionFilters(),
        fetchQuestions(filters),
        fetchPerformance(),
        fetchHistory(),
        fetchReviewErrors(),
        fetchSimulations()
      ]);
      setCatalogFilters(loadedFilters);
      setQuestions(loadedQuestions);
      setPerformance(loadedPerformance);
      setHistory(loadedHistory);
      setReviewErrors(loadedReview);
      setSimulations(loadedSimulations);
      if (loadedQuestions[0]) await selectQuestion(loadedQuestions[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o banco de questoes.");
    } finally {
      setLoading(false);
    }
  }

  async function search(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setActionLoading(true);
    setError("");
    try {
      const loadedQuestions = await fetchQuestions(filters);
      setQuestions(loadedQuestions);
      if (loadedQuestions[0]) await selectQuestion(loadedQuestions[0].id);
      else setActiveQuestion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel buscar questoes.");
    } finally {
      setActionLoading(false);
    }
  }

  async function refreshStudentStats() {
    const [loadedPerformance, loadedHistory, loadedReview, loadedSimulations] = await Promise.all([
      fetchPerformance(),
      fetchHistory(),
      fetchReviewErrors(),
      fetchSimulations()
    ]);
    setPerformance(loadedPerformance);
    setHistory(loadedHistory);
    setReviewErrors(loadedReview);
    setSimulations(loadedSimulations);
  }

  async function selectQuestion(id: string) {
    setActionLoading(true);
    setAnswer("");
    setDiscursiveAnswer("");
    setStartedAt(Date.now());
    setError("");
    try {
      setActiveQuestion(await fetchQuestionDetail(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel abrir a questao.");
    } finally {
      setActionLoading(false);
    }
  }

  async function submitAnswer() {
    if (!activeQuestion) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      await submitQuestionAttempt(activeQuestion.id, {
        selectedAnswer: activeQuestion.kind === "DISCURSIVE" ? undefined : answer,
        discursiveAnswer: activeQuestion.kind === "DISCURSIVE" ? discursiveAnswer : undefined,
        timeSeconds: Math.round((Date.now() - startedAt) / 1000)
      });
      setSuccess(activeQuestion.kind === "DISCURSIVE" ? "Resposta enviada para correcao." : "Resposta registrada.");
      await Promise.all([selectQuestion(activeQuestion.id), refreshStudentStats(), search()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar a resposta.");
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleFavorite(question: QuestionSummary) {
    setActionLoading(true);
    setError("");
    try {
      const favorite = !isFavorite(question);
      await setQuestionFavorite(question.id, favorite);
      setQuestions((current) =>
        current.map((item) => (item.id === question.id ? { ...item, favorites: favorite ? [{ id: "local" }] : [] } : item))
      );
      if (activeQuestion?.id === question.id) setActiveQuestion({ ...activeQuestion, favorites: favorite ? [{ id: "local" }] : [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar favorito.");
    } finally {
      setActionLoading(false);
    }
  }

  async function startSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const simulation = await createSimulation(simulationTitle, simulationCount, filters);
      setActiveSimulation(simulation);
      setSimulationResults(null);
      setSimulationAnswers({});
      setTab("simulados");
      setSuccess("Simulado criado.");
      setSimulations(await fetchSimulations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar o simulado.");
    } finally {
      setActionLoading(false);
    }
  }

  async function openSimulation(id: string) {
    setActionLoading(true);
    setError("");
    setSimulationResults(null);
    try {
      setActiveSimulation(await fetchSimulation(id));
      setSimulationAnswers({});
      setTab("simulados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel abrir o simulado.");
    } finally {
      setActionLoading(false);
    }
  }

  async function answerSimulation(item: SimulationDetail["questions"][number]) {
    if (!activeSimulation) return;
    const value = simulationAnswers[item.questionId]?.trim() ?? "";
    setActionLoading(true);
    setError("");
    try {
      await answerSimulationQuestion(activeSimulation.id, item.questionId, {
        selectedAnswer: item.question.kind === "DISCURSIVE" ? undefined : value,
        discursiveAnswer: item.question.kind === "DISCURSIVE" ? value : undefined,
        timeSeconds: 0
      });
      setActiveSimulation(await fetchSimulation(activeSimulation.id));
      await refreshStudentStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel responder a questao do simulado.");
    } finally {
      setActionLoading(false);
    }
  }

  async function finishSimulation() {
    if (!activeSimulation) return;
    setActionLoading(true);
    setError("");
    try {
      const results = await submitSimulation(activeSimulation.id);
      setSimulationResults(results);
      setActiveSimulation(await fetchSimulation(activeSimulation.id));
      await refreshStudentStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel finalizar o simulado.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/"><BrandMark /></Link>
          <div className="flex items-center gap-2">
            {(["banco", "simulados", "revisao"] as const).map((item) => (
              <button
                key={item}
                className={cn(
                  "h-10 rounded-md px-3 text-sm font-semibold capitalize text-zinc-300 hover:bg-zinc-800",
                  tab === item && "bg-zinc-800 text-white"
                )}
                type="button"
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <section className="border-b border-zinc-800">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-foxtrot-300">Questoes e simulados</p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase text-white">Banco de questoes</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Target className="h-4 w-4" />} label="Questoes resolvidas" value={String(totals.attempts)} />
            <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Aproveitamento" value={`${totals.accuracy}%`} tone="zinc" />
            <StatCard icon={<AlertCircle className="h-4 w-4" />} label="Pendentes" value={String(totals.pending)} tone="red" />
            <StatCard icon={<BookOpenCheck className="h-4 w-4" />} label="Simulados" value={String(simulations.length)} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {error && <Status tone="error" message={error} />}
        {success && <Status tone="success" message={success} />}
        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center text-zinc-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando questoes
          </div>
        ) : (
          <>
            {tab === "banco" && (
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <FilterPanel
                  filters={filters}
                  catalogFilters={catalogFilters}
                  selectedSubject={selectedSubject}
                  actionLoading={actionLoading}
                  onChange={setFilters}
                  onSearch={search}
                  onStartSimulation={startSimulation}
                  simulationTitle={simulationTitle}
                  simulationCount={simulationCount}
                  onSimulationTitle={setSimulationTitle}
                  onSimulationCount={setSimulationCount}
                />
                <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <QuestionList
                    questions={questions}
                    activeId={activeQuestion?.id}
                    loading={actionLoading}
                    onSelect={selectQuestion}
                    onFavorite={toggleFavorite}
                  />
                  <QuestionWorkspace
                    question={activeQuestion}
                    answer={answer}
                    discursiveAnswer={discursiveAnswer}
                    loading={actionLoading}
                    onAnswer={setAnswer}
                    onDiscursiveAnswer={setDiscursiveAnswer}
                    onSubmit={submitAnswer}
                    onFavorite={toggleFavorite}
                  />
                </section>
              </div>
            )}

            {tab === "simulados" && (
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <SimulationList simulations={simulations} activeId={activeSimulation?.id} onOpen={openSimulation} />
                <SimulationWorkspace
                  simulation={activeSimulation}
                  results={simulationResults ?? activeSimulation?.results ?? null}
                  answers={simulationAnswers}
                  loading={actionLoading}
                  onAnswerChange={(questionId, value) => setSimulationAnswers((current) => ({ ...current, [questionId]: value }))}
                  onAnswer={answerSimulation}
                  onFinish={finishSimulation}
                />
              </div>
            )}

            {tab === "revisao" && (
              <ReviewPanel
                performance={performance}
                history={history}
                reviewErrors={reviewErrors}
                onOpenQuestion={(id) => {
                  setTab("banco");
                  void selectQuestion(id);
                }}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function FilterPanel({
  filters,
  catalogFilters,
  selectedSubject,
  actionLoading,
  onChange,
  onSearch,
  onStartSimulation,
  simulationTitle,
  simulationCount,
  onSimulationTitle,
  onSimulationCount
}: {
  filters: QuestionSearch;
  catalogFilters: QuestionFilters | null;
  selectedSubject?: { topics: Array<{ id: string; name: string }> };
  actionLoading: boolean;
  onChange: (filters: QuestionSearch) => void;
  onSearch: (event?: FormEvent<HTMLFormElement>) => void;
  onStartSimulation: (event: FormEvent<HTMLFormElement>) => void;
  simulationTitle: string;
  simulationCount: number;
  onSimulationTitle: (value: string) => void;
  onSimulationCount: (value: number) => void;
}) {
  return (
    <aside className="grid content-start gap-4">
      <form className="rounded-md border border-zinc-800 bg-zinc-950 p-4" onSubmit={onSearch}>
        <h1 className="font-display text-2xl font-bold uppercase text-white">Banco de questoes</h1>
        <div className="mt-4 grid gap-3">
          <TextInput icon={<Search className="h-4 w-4" />} label="Buscar" value={filters.q ?? ""} onChange={(q) => onChange({ ...filters, q })} />
          <Select label="Banca" value={filters.boardId ?? ""} items={catalogFilters?.boards ?? []} onChange={(boardId) => onChange({ ...filters, boardId })} />
          <Select label="Carreira" value={filters.careerId ?? ""} items={catalogFilters?.careers ?? []} onChange={(careerId) => onChange({ ...filters, careerId })} />
          <Select
            label="Materia"
            value={filters.subjectId ?? ""}
            items={catalogFilters?.subjects ?? []}
            onChange={(subjectId) => onChange({ ...filters, subjectId, topicId: "" })}
          />
          <Select label="Assunto" value={filters.topicId ?? ""} items={selectedSubject?.topics ?? []} onChange={(topicId) => onChange({ ...filters, topicId })} />
          <div className="grid grid-cols-2 gap-2">
            <TextInput label="Ano inicial" value={filters.yearFrom ?? ""} onChange={(yearFrom) => onChange({ ...filters, yearFrom, year: "" })} />
            <TextInput label="Ano final" value={filters.yearTo ?? ""} onChange={(yearTo) => onChange({ ...filters, yearTo, year: "" })} />
          </div>
          <Select label="Instituicao" value={filters.institutionId ?? ""} items={catalogFilters?.institutions ?? []} onChange={(institutionId) => onChange({ ...filters, institutionId })} />
          <Select label="Cargo" value={filters.positionId ?? ""} items={catalogFilters?.positions ?? []} onChange={(positionId) => onChange({ ...filters, positionId })} />
          <select
            className="h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
            value={filters.kind ?? ""}
            onChange={(event) => onChange({ ...filters, kind: event.target.value as QuestionSearch["kind"] })}
          >
            <option value="">Tipo</option>
            {(catalogFilters?.kinds ?? []).map((kind) => <option key={kind} value={kind}>{kindLabel(kind)}</option>)}
          </select>
          <select
            className="h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
            value={filters.answered ?? ""}
            onChange={(event) => onChange({ ...filters, answered: event.target.value as QuestionSearch["answered"] })}
          >
            <option value="">Status</option>
            <option value="unanswered">Nao respondidas</option>
            <option value="correct">Acertadas</option>
            <option value="incorrect">Erradas</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input checked={Boolean(filters.favorite)} type="checkbox" onChange={(event) => onChange({ ...filters, favorite: event.target.checked })} />
            Favoritas
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input checked={Boolean(filters.hasExplanation)} type="checkbox" onChange={(event) => onChange({ ...filters, hasExplanation: event.target.checked })} />
            Com explicacao
          </label>
          <Button disabled={actionLoading} type="submit"><Filter className="h-4 w-4" /> Aplicar filtros</Button>
        </div>
      </form>

      <form className="rounded-md border border-zinc-800 bg-zinc-950 p-4" onSubmit={onStartSimulation}>
        <h2 className="font-display text-lg font-bold uppercase text-white">Novo simulado</h2>
        <div className="mt-3 grid gap-3">
          <TextInput label="Titulo" value={simulationTitle} onChange={onSimulationTitle} />
          <label className="text-xs uppercase text-zinc-500">
            Questoes
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
              max={100}
              min={1}
              type="number"
              value={simulationCount}
              onChange={(event) => onSimulationCount(Number(event.target.value))}
            />
          </label>
          <Button disabled={actionLoading} type="submit"><Target className="h-4 w-4" /> Criar com filtros atuais</Button>
        </div>
      </form>
    </aside>
  );
}

function QuestionList({
  questions,
  activeId,
  loading,
  onSelect,
  onFavorite
}: {
  questions: QuestionSummary[];
  activeId?: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onFavorite: (question: QuestionSummary) => void;
}) {
  return (
    <section className="grid content-start gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold uppercase text-white">Resultados</h2>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}
      </div>
      {questions.length === 0 && <EmptyState icon={<Search className="h-5 w-5" />} text="Nenhuma questao encontrada." />}
      {questions.map((question) => (
        <article
          key={question.id}
          className={cn(
            "rounded-md border bg-zinc-950 p-4",
            activeId === question.id ? "border-foxtrot-500" : "border-zinc-800"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <button className="text-left" type="button" onClick={() => onSelect(question.id)}>
              <p className="text-xs uppercase text-zinc-500">{question.code} / {question.board.name} / {question.year}</p>
              <h3 className="mt-2 line-clamp-3 font-semibold text-white">{question.statement}</h3>
              <p className="mt-2 text-sm text-zinc-400">{question.subject.name}{question.topic ? ` / ${question.topic.name}` : ""}</p>
            </button>
            <button className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800" type="button" onClick={() => onFavorite(question)}>
              <Heart className={cn("h-5 w-5", isFavorite(question) && "fill-red-500 text-red-500")} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase text-zinc-500">
            <span>{kindLabel(question.kind)}</span>
            {question.attempts?.[0] && <ResultBadge value={question.attempts[0].isCorrect} />}
          </div>
        </article>
      ))}
    </section>
  );
}

function QuestionWorkspace({
  question,
  answer,
  discursiveAnswer,
  loading,
  onAnswer,
  onDiscursiveAnswer,
  onSubmit,
  onFavorite
}: {
  question: QuestionDetail | null;
  answer: string;
  discursiveAnswer: string;
  loading: boolean;
  onAnswer: (value: string) => void;
  onDiscursiveAnswer: (value: string) => void;
  onSubmit: () => void;
  onFavorite: (question: QuestionSummary) => void;
}) {
  if (!question) return <EmptyState icon={<FileText className="h-5 w-5" />} text="Selecione uma questao." />;
  const alternatives = question.kind === "DISCURSIVE" ? [] : parseAlternatives(question.alternatives);
  const latestAttempt = question.attempts?.[0];
  return (
    <section className="grid content-start gap-4">
      <article className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-zinc-500">{question.code} / {question.institution.name} / {question.position.name}</p>
            <h2 className="mt-3 text-xl font-semibold leading-relaxed text-white">{question.statement}</h2>
          </div>
          <button className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800" type="button" onClick={() => onFavorite(question)}>
            <Heart className={cn("h-5 w-5", isFavorite(question) && "fill-red-500 text-red-500")} />
          </button>
        </div>
        {question.kind === "DISCURSIVE" ? (
          <textarea
            className="mt-5 min-h-36 w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100"
            placeholder="Digite sua resposta discursiva"
            value={discursiveAnswer}
            onChange={(event) => onDiscursiveAnswer(event.target.value)}
          />
        ) : (
          <div className="mt-5 grid gap-3">
            {alternatives.map((alternative) => (
              <button
                key={alternative.id}
                className={cn(
                  "rounded-md border border-zinc-800 bg-zinc-900 p-3 text-left text-sm text-zinc-100 hover:border-foxtrot-500",
                  answer === alternative.id && "border-foxtrot-500 bg-foxtrot-500/10"
                )}
                type="button"
                onClick={() => onAnswer(alternative.id)}
              >
                <strong className="mr-2 text-foxtrot-400">{alternative.id}</strong>{alternative.text}
              </button>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button disabled={loading || (question.kind === "DISCURSIVE" ? !discursiveAnswer.trim() : !answer)} type="button" onClick={onSubmit}>
            <Send className="h-4 w-4" /> Responder
          </Button>
          {latestAttempt && <ResultBadge value={latestAttempt.isCorrect} />}
        </div>
      </article>

      {(latestAttempt || question.explanation || question.answers.length > 0 || question.submissions?.length) && (
        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="font-display text-lg font-bold uppercase text-white">Explicacao</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{question.explanation ?? question.aiAnswer?.body ?? "Explicacao ainda nao disponivel."}</p>
          </article>
          <article className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="font-display text-lg font-bold uppercase text-white">Discussao</h3>
            <div className="mt-3 grid gap-3">
              {question.answers.length === 0 && <p className="text-sm text-zinc-500">Sem respostas publicadas.</p>}
              {question.answers.map((item) => (
                <p key={item.id} className="rounded-md bg-zinc-900 p-3 text-sm text-zinc-300">
                  <strong className="text-white">{item.isOfficial ? "Professor" : item.user.nickname}:</strong> {item.body}
                </p>
              ))}
            </div>
          </article>
        </section>
      )}
    </section>
  );
}

function SimulationList({ simulations, activeId, onOpen }: { simulations: SimulationListItem[]; activeId?: string; onOpen: (id: string) => void }) {
  return (
    <aside className="grid content-start gap-3">
      <h1 className="font-display text-2xl font-bold uppercase text-white">Simulados</h1>
      {simulations.length === 0 && <EmptyState icon={<Target className="h-5 w-5" />} text="Nenhum simulado criado." />}
      {simulations.map((simulation) => {
        const correct = simulation.attempts.filter((attempt) => attempt.isCorrect === true).length;
        return (
          <button
            key={simulation.id}
            className={cn("rounded-md border bg-zinc-950 p-4 text-left", activeId === simulation.id ? "border-foxtrot-500" : "border-zinc-800")}
            type="button"
            onClick={() => onOpen(simulation.id)}
          >
            <p className="text-xs uppercase text-zinc-500">{simulation.status === "SUBMITTED" ? "Finalizado" : "Em andamento"}</p>
            <h2 className="mt-1 font-semibold text-white">{simulation.title}</h2>
            <p className="mt-2 text-sm text-zinc-400">{simulation.attempts.length}/{simulation.questionCount} respondidas / {correct} certas</p>
          </button>
        );
      })}
    </aside>
  );
}

function SimulationWorkspace({
  simulation,
  results,
  answers,
  loading,
  onAnswerChange,
  onAnswer,
  onFinish
}: {
  simulation: SimulationDetail | null;
  results: SimulationResults | null;
  answers: Record<string, string>;
  loading: boolean;
  onAnswerChange: (questionId: string, value: string) => void;
  onAnswer: (item: SimulationDetail["questions"][number]) => void;
  onFinish: () => void;
}) {
  if (!simulation) return <EmptyState icon={<Target className="h-5 w-5" />} text="Abra ou crie um simulado." />;
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-zinc-500">{simulation.status === "SUBMITTED" ? "Resultado" : "Execucao"}</p>
          <h1 className="font-display text-2xl font-bold uppercase text-white">{simulation.title}</h1>
        </div>
        {simulation.status !== "SUBMITTED" && (
          <Button disabled={loading} type="button" onClick={onFinish}><CheckCircle2 className="h-4 w-4" /> Finalizar</Button>
        )}
      </div>
      {results && (
        <section className="grid gap-3 md:grid-cols-3">
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Acertos" value={`${results.correct}/${results.questionCount}`} />
          <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Aproveitamento" value={`${results.accuracy}%`} tone="zinc" />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Pendentes" value={String(results.pending)} tone="red" />
        </section>
      )}
      <div className="grid gap-4">
        {simulation.questions.map((item) => {
          const alternatives = parseAlternatives(item.question.alternatives);
          const answered = item.question.attempts?.[0];
          return (
            <article key={item.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase text-zinc-500">Questao {item.position} / {item.question.code}</p>
              <h2 className="mt-2 font-semibold leading-7 text-white">{item.question.statement}</h2>
              {simulation.status === "SUBMITTED" ? (
                <div className="mt-3 grid gap-2 text-sm text-zinc-300">
                  <ResultBadge value={answered?.isCorrect} />
                  <p>{item.question.explanation ?? "Explicacao ainda nao disponivel."}</p>
                </div>
              ) : item.question.kind === "DISCURSIVE" ? (
                <div className="mt-4 grid gap-3">
                  <textarea
                    className="min-h-28 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100"
                    value={answers[item.questionId] ?? ""}
                    onChange={(event) => onAnswerChange(item.questionId, event.target.value)}
                  />
                  <Button disabled={loading || !answers[item.questionId]?.trim()} type="button" onClick={() => onAnswer(item)}>Salvar resposta</Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {alternatives.map((alternative) => (
                    <button
                      key={alternative.id}
                      className={cn(
                        "rounded-md border border-zinc-800 bg-zinc-900 p-3 text-left text-sm hover:border-foxtrot-500",
                        answers[item.questionId] === alternative.id && "border-foxtrot-500 bg-foxtrot-500/10"
                      )}
                      type="button"
                      onClick={() => onAnswerChange(item.questionId, alternative.id)}
                    >
                      <strong className="mr-2 text-foxtrot-400">{alternative.id}</strong>{alternative.text}
                    </button>
                  ))}
                  <Button disabled={loading || !answers[item.questionId]} type="button" onClick={() => onAnswer(item)}>Salvar resposta</Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReviewPanel({
  performance,
  history,
  reviewErrors,
  onOpenQuestion
}: {
  performance: PerformanceSubject[];
  history: AttemptHistory[];
  reviewErrors: AttemptHistory[];
  onOpenQuestion: (id: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="grid content-start gap-3">
        <h1 className="font-display text-2xl font-bold uppercase text-white">Desempenho por tema</h1>
        {performance.length === 0 && <EmptyState icon={<BarChart3 className="h-5 w-5" />} text="Resolva questoes para gerar desempenho." />}
        {performance.map((subject) => (
          <article key={subject.subjectId} className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">{subject.subject}</h2>
              <span className="text-sm text-zinc-400">{subject.accuracy}%</span>
            </div>
            <div className="mt-3 h-2 rounded bg-zinc-800">
              <div className="h-2 rounded bg-foxtrot-500" style={{ width: `${subject.accuracy}%` }} />
            </div>
            <div className="mt-3 grid gap-2">
              {subject.topics.map((topic) => (
                <p key={topic.topicId ?? topic.topic} className="flex justify-between text-sm text-zinc-400">
                  <span>{topic.topic}</span><span>{topic.correct}/{topic.total}</span>
                </p>
              ))}
            </div>
          </article>
        ))}
      </section>
      <section className="grid content-start gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-white">Revisao de erros</h1>
          <div className="mt-3 grid gap-3">
            {reviewErrors.length === 0 && <EmptyState icon={<RotateCcw className="h-5 w-5" />} text="Nenhum erro registrado." />}
            {reviewErrors.map((item) => (
              <button key={item.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-left" type="button" onClick={() => onOpenQuestion(item.question.id)}>
                <p className="text-xs uppercase text-zinc-500">{item.question.code} / {item.question.subject.name}</p>
                <h2 className="mt-2 line-clamp-2 font-semibold text-white">{item.question.statement}</h2>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold uppercase text-white">Historico</h2>
          <div className="mt-3 grid gap-2">
            {history.slice(0, 12).map((item) => (
              <button key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-left" type="button" onClick={() => onOpenQuestion(item.question.id)}>
                <span className="line-clamp-1 text-sm text-zinc-300"><History className="mr-2 inline h-4 w-4 text-zinc-500" />{item.question.code}</span>
                <ResultBadge value={item.isCorrect} />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Select({ label, value, items, onChange }: { label: string; value: string; items: Array<{ id: string; name: string }>; onChange: (value: string) => void }) {
  return (
    <label className="text-xs uppercase text-zinc-500">
      {label}
      <select className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
  );
}

function TextInput({ label, value, icon, onChange }: { label: string; value: string; icon?: React.ReactNode; onChange: (value: string) => void }) {
  return (
    <label className="text-xs uppercase text-zinc-500">
      {label}
      <span className="mt-1 flex h-10 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100">
        {icon}
        <input className="w-full bg-transparent outline-none" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function ResultBadge({ value }: { value?: boolean | null }) {
  if (value === true) return <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-xs font-semibold uppercase text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Correta</span>;
  if (value === false) return <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-xs font-semibold uppercase text-red-400"><XCircle className="h-3 w-3" /> Errada</span>;
  return <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs font-semibold uppercase text-zinc-300"><FileText className="h-3 w-3" /> Pendente</span>;
}

function Status({ tone, message }: { tone: "error" | "success"; message: string }) {
  return (
    <p className={cn("mb-4 rounded-md border p-3 text-sm", tone === "error" ? "border-red-900 bg-red-950/40 text-red-200" : "border-emerald-900 bg-emerald-950/40 text-emerald-200")}>
      {message}
    </p>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-zinc-900 text-zinc-400">{icon}</div>
      {text}
    </div>
  );
}

function isFavorite(question: QuestionSummary) {
  return Boolean(question.favorites?.length);
}
