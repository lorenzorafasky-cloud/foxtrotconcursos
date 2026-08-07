"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  CheckCircle2,
  FilePenLine,
  GraduationCap,
  Layers3,
  Loader2,
  LogIn,
  LogOut,
  MessageSquareText,
  Plus,
  Send,
  ShieldAlert,
  Target,
  UploadCloud,
  Users,
  Video
} from "lucide-react";
import { BrandMark, Button, StatCard, cn } from "@foxtrot/ui";
import { apiRequest, AuthProfile } from "../lib/api";
import {
  CourseStatus,
  LessonAssetType,
  ProfessorCatalog,
  ProfessorDashboard,
  QuestionKind,
  answerLessonDoubt,
  createCourse,
  createLesson,
  createMaterial,
  createModule,
  createProfessorSimulation,
  createQuestion,
  fetchProfessorCatalog,
  fetchProfessorDashboard,
  gradeEssay,
  publishCourse,
  publishLesson,
  slugFrom
} from "../lib/professor";

type Tab = "conteudo" | "duvidas" | "alunos" | "questoes" | "discursivas";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "conteudo", label: "Conteudo" },
  { id: "duvidas", label: "Duvidas" },
  { id: "alunos", label: "Alunos" },
  { id: "questoes", label: "Questoes" },
  { id: "discursivas", label: "Discursivas" }
];

export default function ProfessorHome() {
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [dashboard, setDashboard] = useState<ProfessorDashboard | null>(null);
  const [catalog, setCatalog] = useState<ProfessorCatalog | null>(null);
  const [tab, setTab] = useState<Tab>("conteudo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [status, setStatus] = useState("Validando sessao...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [essayFeedback, setEssayFeedback] = useState<Record<string, { score: string; feedback: string }>>({});
  const [courseForm, setCourseForm] = useState({ title: "", slug: "", description: "", status: "PRE_EDITAL" as CourseStatus, careerId: "", boardId: "", area: "", workloadMinutes: "0" });
  const [moduleForm, setModuleForm] = useState({ courseId: "", title: "", position: "1" });
  const [lessonForm, setLessonForm] = useState({ moduleId: "", subjectId: "", topicId: "", title: "", slug: "", description: "", position: "1", streamVideoUid: "", durationSeconds: "0" });
  const [materialForm, setMaterialForm] = useState({ lessonId: "", type: "PDF" as LessonAssetType, url: "", downloadable: true });
  const [questionForm, setQuestionForm] = useState({
    code: "",
    kind: "MULTIPLE_CHOICE" as QuestionKind,
    statement: "",
    alternativesText: "A) \nB) \nC) \nD) ",
    correctAnswer: "",
    year: String(new Date().getFullYear()),
    boardId: "",
    careerId: "",
    subjectId: "",
    topicId: "",
    institutionId: "",
    positionId: "",
    sourceExam: "",
    explanation: ""
  });
  const [simulationForm, setSimulationForm] = useState({ title: "Simulado do professor", questionCount: "10", subjectId: "", topicId: "", kind: "" as QuestionKind | "" });

  useEffect(() => {
    void loadMe();
  }, []);

  const selectedLessonSubject = useMemo(
    () => catalog?.subjects.find((subject) => subject.id === lessonForm.subjectId),
    [catalog, lessonForm.subjectId]
  );
  const selectedQuestionSubject = useMemo(
    () => catalog?.subjects.find((subject) => subject.id === questionForm.subjectId),
    [catalog, questionForm.subjectId]
  );
  const selectedSimulationSubject = useMemo(
    () => catalog?.subjects.find((subject) => subject.id === simulationForm.subjectId),
    [catalog, simulationForm.subjectId]
  );
  const modules = useMemo(() => catalog?.courses.flatMap((course) => course.modules.map((module) => ({ ...module, courseTitle: course.title }))) ?? [], [catalog]);
  const lessons = useMemo(() => dashboard?.lessons ?? [], [dashboard]);

  async function loadMe() {
    setLoading(true);
    try {
      const profile = await apiRequest<AuthProfile>("/auth/me");
      if (!profile.roles.some((role) => ["PROFESSOR", "ADMIN_MASTER"].includes(role))) {
        setStatus("Seu perfil nao tem acesso ao painel do professor.");
        setUser(null);
        return;
      }
      setUser(profile);
      setStatus("");
      await reload();
    } catch {
      setStatus("Entre com uma conta de professor.");
    } finally {
      setLoading(false);
    }
  }

  async function reload() {
    const [nextDashboard, nextCatalog] = await Promise.all([fetchProfessorDashboard(), fetchProfessorCatalog()]);
    setDashboard(nextDashboard);
    setCatalog(nextCatalog);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Autenticando...");
    try {
      const result = await apiRequest<{ requiresTwoFactor?: boolean; emailVerificationRequired?: boolean }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode || undefined })
      });
      if (result.emailVerificationRequired) return setStatus("Confirme o e-mail antes de acessar o painel.");
      if (result.requiresTwoFactor) return setStatus("Informe o codigo 2FA para concluir.");
      await loadMe();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha no login.");
    }
  }

  async function logout() {
    await apiRequest("/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined);
    setUser(null);
    setStatus("Sessao encerrada.");
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setStatus("");
    try {
      await action();
      setStatus(success);
      await reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel concluir a acao.");
    } finally {
      setSaving(false);
    }
  }

  async function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseForm.title.trim() || !courseForm.slug.trim() || !courseForm.description.trim() || !courseForm.careerId || !courseForm.area.trim()) {
      setStatus("Preencha titulo, slug, descricao, carreira e area do curso.");
      return;
    }
    await runAction(
      () => createCourse({ ...courseForm, boardId: courseForm.boardId || undefined, workloadMinutes: Number(courseForm.workloadMinutes) }),
      "Curso criado."
    );
  }

  async function submitModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moduleForm.courseId || !moduleForm.title.trim()) return setStatus("Escolha o curso e informe o modulo.");
    await runAction(() => createModule({ courseId: moduleForm.courseId, title: moduleForm.title, position: Number(moduleForm.position) }), "Modulo criado.");
  }

  async function submitLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lessonForm.moduleId || !lessonForm.subjectId || !lessonForm.title.trim() || !lessonForm.slug.trim() || !lessonForm.description.trim()) {
      setStatus("Preencha modulo, materia, titulo, slug e descricao da aula.");
      return;
    }
    await runAction(
      () => createLesson({ ...lessonForm, topicId: lessonForm.topicId || undefined, durationSeconds: Number(lessonForm.durationSeconds), position: Number(lessonForm.position) }),
      "Aula criada."
    );
  }

  async function submitMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!materialForm.lessonId || !materialForm.url.trim()) return setStatus("Escolha a aula e informe a URL/chave do material.");
    await runAction(
      () => createMaterial({ lessonId: materialForm.lessonId, type: materialForm.type, url: materialForm.url, metadata: { downloadable: materialForm.downloadable } }),
      "Material vinculado."
    );
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!questionForm.code.trim() || !questionForm.statement.trim() || !questionForm.boardId || !questionForm.careerId || !questionForm.subjectId || !questionForm.institutionId || !questionForm.positionId) {
      setStatus("Preencha os dados obrigatorios da questao.");
      return;
    }
    const alternatives = parseAlternatives(questionForm.alternativesText);
    await runAction(
      () =>
        createQuestion({
          code: questionForm.code,
          kind: questionForm.kind,
          statement: questionForm.statement,
          alternatives: questionForm.kind === "DISCURSIVE" ? undefined : alternatives,
          correctAnswer: questionForm.kind === "DISCURSIVE" ? undefined : questionForm.correctAnswer,
          year: Number(questionForm.year),
          boardId: questionForm.boardId,
          careerId: questionForm.careerId,
          subjectId: questionForm.subjectId,
          topicId: questionForm.topicId || undefined,
          institutionId: questionForm.institutionId,
          positionId: questionForm.positionId,
          sourceExam: questionForm.sourceExam || undefined,
          explanation: questionForm.explanation || undefined
        }),
      "Questao criada."
    );
  }

  async function submitSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!simulationForm.title.trim()) return setStatus("Informe o titulo do simulado.");
    await runAction(
      () =>
        createProfessorSimulation({
          title: simulationForm.title,
          questionCount: Number(simulationForm.questionCount),
          filters: {
            subjectId: simulationForm.subjectId || undefined,
            topicId: simulationForm.topicId || undefined,
            kind: simulationForm.kind || undefined
          }
        }),
      "Simulado montado."
    );
  }

  async function answerDoubt(doubtId: string) {
    const answer = answers[doubtId]?.trim();
    if (!answer) return setStatus("Informe a resposta antes de enviar.");
    await runAction(() => answerLessonDoubt(doubtId, answer), "Resposta enviada ao aluno.");
    setAnswers((current) => ({ ...current, [doubtId]: "" }));
  }

  async function submitEssayGrade(essayId: string) {
    const payload = essayFeedback[essayId];
    if (!payload?.feedback.trim() || !payload.score) return setStatus("Informe nota e feedback da discursiva.");
    await runAction(() => gradeEssay(essayId, { finalScore: Number(payload.score), finalFeedback: payload.feedback }), "Discursiva corrigida.");
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-md border border-zinc-800 bg-zinc-950 p-6">
          <BrandMark />
          <h1 className="mt-8 font-display text-3xl font-black uppercase text-white">Professor</h1>
          <TextInput label="E-mail" type="email" value={email} onChange={setEmail} />
          <TextInput label="Senha" type="password" value={password} onChange={setPassword} />
          <TextInput label="Codigo 2FA" value={twoFactorCode} onChange={setTwoFactorCode} />
          <Button className="mt-6 w-full" type="submit"><LogIn className="h-4 w-4" /> Entrar</Button>
          <p className="mt-4 min-h-5 text-sm text-zinc-400">{status}</p>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => void reload()}><Loader2 className={cn("h-4 w-4", loading && "animate-spin")} /> Atualizar</Button>
            <Button type="button" variant="ghost" onClick={logout}><LogOut className="h-4 w-4" /> Sair</Button>
          </div>
        </div>
      </header>

      <section className="relative border-b border-zinc-800">
        <img alt="Estudio de gravacao" className="absolute inset-0 h-full w-full object-cover opacity-16" src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1600&auto=format&fit=crop" />
        <div className="relative mx-auto max-w-7xl px-4 py-8">
          <h1 className="font-display text-4xl font-black uppercase text-white">Painel do instrutor</h1>
          <p className="mt-2 max-w-2xl text-zinc-300">Crie conteudo, acompanhe alunos, responda duvidas e corrija discursivas dentro do seu escopo.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button key={item.id} type="button" onClick={() => setTab(item.id)} className={cn("h-10 rounded-md px-4 text-sm font-semibold text-zinc-300 hover:bg-zinc-800", tab === item.id && "bg-zinc-800 text-white")}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 md:grid-cols-4">
        <StatCard icon={<MessageSquareText className="h-4 w-4" />} label="Duvidas abertas" value={String(dashboard?.doubts.length ?? 0)} />
        <StatCard icon={<FilePenLine className="h-4 w-4" />} label="Discursivas" value={String(dashboard?.essays.length ?? 0)} tone="red" />
        <StatCard icon={<Video className="h-4 w-4" />} label="Aulas publicadas" value={String(dashboard?.lessons.filter((lesson) => lesson.publishedAt).length ?? 0)} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Alunos acompanhados" value={String(dashboard?.students.length ?? 0)} tone="zinc" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10">
        {status && <p className="mb-4 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">{status}</p>}
        {tab === "conteudo" && catalog && (
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Panel title="Curso">
              <form className="grid gap-3" onSubmit={submitCourse}>
                <TextInput label="Titulo" value={courseForm.title} onChange={(title) => setCourseForm((current) => ({ ...current, title, slug: current.slug || slugFrom(title) }))} />
                <TextInput label="Slug" value={courseForm.slug} onChange={(slug) => setCourseForm((current) => ({ ...current, slug }))} />
                <Textarea label="Descricao" value={courseForm.description} onChange={(description) => setCourseForm((current) => ({ ...current, description }))} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Select label="Carreira" value={courseForm.careerId} items={catalog.careers} onChange={(careerId) => setCourseForm((current) => ({ ...current, careerId }))} />
                  <Select label="Banca" value={courseForm.boardId} items={catalog.boards} onChange={(boardId) => setCourseForm((current) => ({ ...current, boardId }))} />
                  <TextInput label="Area" value={courseForm.area} onChange={(area) => setCourseForm((current) => ({ ...current, area }))} />
                  <Select label="Status" value={courseForm.status} items={catalog.courseStatuses.map((status) => ({ id: status, name: status }))} onChange={(status) => setCourseForm((current) => ({ ...current, status: status as CourseStatus }))} />
                </div>
                <Button disabled={saving} type="submit"><Plus className="h-4 w-4" /> Criar curso</Button>
              </form>
            </Panel>

            <Panel title="Modulo, aula e material">
              <form className="grid gap-3" onSubmit={submitModule}>
                <Select label="Curso" value={moduleForm.courseId} items={catalog.courses.map((course) => ({ id: course.id, name: course.title }))} onChange={(courseId) => setModuleForm((current) => ({ ...current, courseId }))} />
                <div className="grid gap-3 md:grid-cols-[1fr_100px]">
                  <TextInput label="Modulo" value={moduleForm.title} onChange={(title) => setModuleForm((current) => ({ ...current, title }))} />
                  <TextInput label="Ordem" value={moduleForm.position} onChange={(position) => setModuleForm((current) => ({ ...current, position }))} />
                </div>
                <Button disabled={saving} type="submit" variant="ghost"><Layers3 className="h-4 w-4" /> Criar modulo</Button>
              </form>
              <form className="mt-6 grid gap-3 border-t border-zinc-800 pt-4" onSubmit={submitLesson}>
                <Select label="Modulo" value={lessonForm.moduleId} items={modules.map((module) => ({ id: module.id, name: `${module.courseTitle} / ${module.title}` }))} onChange={(moduleId) => setLessonForm((current) => ({ ...current, moduleId }))} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Select label="Materia" value={lessonForm.subjectId} items={catalog.subjects} onChange={(subjectId) => setLessonForm((current) => ({ ...current, subjectId, topicId: "" }))} />
                  <Select label="Assunto" value={lessonForm.topicId} items={selectedLessonSubject?.topics ?? []} onChange={(topicId) => setLessonForm((current) => ({ ...current, topicId }))} />
                </div>
                <TextInput label="Titulo da aula" value={lessonForm.title} onChange={(title) => setLessonForm((current) => ({ ...current, title, slug: current.slug || slugFrom(title) }))} />
                <TextInput label="Slug da aula" value={lessonForm.slug} onChange={(slug) => setLessonForm((current) => ({ ...current, slug }))} />
                <Textarea label="Descricao" value={lessonForm.description} onChange={(description) => setLessonForm((current) => ({ ...current, description }))} />
                <div className="grid gap-3 md:grid-cols-3">
                  <TextInput label="Ordem" value={lessonForm.position} onChange={(position) => setLessonForm((current) => ({ ...current, position }))} />
                  <TextInput label="Duracao seg." value={lessonForm.durationSeconds} onChange={(durationSeconds) => setLessonForm((current) => ({ ...current, durationSeconds }))} />
                  <TextInput label="Video UID" value={lessonForm.streamVideoUid} onChange={(streamVideoUid) => setLessonForm((current) => ({ ...current, streamVideoUid }))} />
                </div>
                <Button disabled={saving} type="submit"><Video className="h-4 w-4" /> Criar aula</Button>
              </form>
              <form className="mt-6 grid gap-3 border-t border-zinc-800 pt-4" onSubmit={submitMaterial}>
                <Select label="Aula" value={materialForm.lessonId} items={lessons.map((lesson) => ({ id: lesson.id, name: lesson.title }))} onChange={(lessonId) => setMaterialForm((current) => ({ ...current, lessonId }))} />
                <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                  <Select label="Tipo" value={materialForm.type} items={catalog.assetTypes.map((type) => ({ id: type, name: type }))} onChange={(type) => setMaterialForm((current) => ({ ...current, type: type as LessonAssetType }))} />
                  <TextInput label="URL ou chave" value={materialForm.url} onChange={(url) => setMaterialForm((current) => ({ ...current, url }))} />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input checked={materialForm.downloadable} type="checkbox" onChange={(event) => setMaterialForm((current) => ({ ...current, downloadable: event.target.checked }))} />
                  Download permitido
                </label>
                <Button disabled={saving} type="submit"><UploadCloud className="h-4 w-4" /> Vincular material</Button>
              </form>
            </Panel>

            <Panel title="Cursos publicados">
              <div className="grid gap-3">
                {catalog.courses.map((course) => (
                  <article key={course.id} className="rounded-md border border-zinc-800 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase text-zinc-500">{course.career.name} / {course.status}</p>
                        <h3 className="font-semibold text-white">{course.title}</h3>
                        <p className="text-sm text-zinc-400">{course.modules.length} modulos</p>
                      </div>
                      {!course.publishedAt && <Button type="button" variant="ghost" onClick={() => void runAction(() => publishCourse(course.id), "Curso publicado.")}>Publicar</Button>}
                    </div>
                  </article>
                ))}
              </div>
            </Panel>
            <Panel title="Aulas">
              <div className="grid gap-3">
                {lessons.map((lesson) => (
                  <article key={lesson.id} className="rounded-md border border-zinc-800 p-3">
                    <p className="text-xs uppercase text-zinc-500">{lesson.subject?.name ?? "Materia"} / {lesson.publishedAt ? "Publicada" : "Rascunho"}</p>
                    <h3 className="font-semibold text-white">{lesson.title}</h3>
                    {!lesson.publishedAt && <Button className="mt-3" type="button" variant="ghost" onClick={() => void runAction(() => publishLesson(lesson.id), "Aula publicada.")}>Publicar aula</Button>}
                  </article>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {tab === "duvidas" && (
          <Panel title="Duvidas por aula">
            <div className="grid gap-3">
              {dashboard?.doubts.map((doubt) => (
                <article key={doubt.id} className="rounded-md border border-zinc-800 p-4">
                  <p className="text-xs uppercase text-zinc-500">{doubt.lesson.module?.course?.title} / {doubt.lesson.title}</p>
                  <h3 className="mt-1 font-semibold text-white">{doubt.user.fullName}</h3>
                  <p className="mt-2 text-sm text-zinc-300">{doubt.message}</p>
                  <Textarea label="Resposta" value={answers[doubt.id] ?? ""} onChange={(answer) => setAnswers((current) => ({ ...current, [doubt.id]: answer }))} />
                  <Button className="mt-3" disabled={saving} type="button" onClick={() => void answerDoubt(doubt.id)}><Send className="h-4 w-4" /> Responder</Button>
                </article>
              ))}
              {dashboard?.doubts.length === 0 && <Empty text="Nenhuma duvida aberta." />}
            </div>
          </Panel>
        )}

        {tab === "alunos" && (
          <Panel title="Acompanhamento de alunos">
            <div className="grid gap-3">
              {dashboard?.students.map((student) => (
                <article key={student.id} className="rounded-md border border-zinc-800 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{student.user.fullName}</h3>
                      <p className="text-sm text-zinc-400">{student.course.title}</p>
                    </div>
                    <strong className="text-foxtrot-400">{student.stats.progressPercent}%</strong>
                  </div>
                  <div className="mt-3 h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-foxtrot-500" style={{ width: `${student.stats.progressPercent}%` }} /></div>
                  <p className="mt-2 text-sm text-zinc-500">{student.stats.completedLessons}/{student.stats.lessonCount} aulas / {Math.round(student.stats.watchedSeconds / 60)} min assistidos</p>
                </article>
              ))}
              {dashboard?.students.length === 0 && <Empty text="Nenhum aluno matriculado nos seus cursos." />}
            </div>
          </Panel>
        )}

        {tab === "questoes" && catalog && (
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Panel title="Criar questao">
              <form className="grid gap-3" onSubmit={submitQuestion}>
                <div className="grid gap-3 md:grid-cols-3">
                  <TextInput label="Codigo" value={questionForm.code} onChange={(code) => setQuestionForm((current) => ({ ...current, code }))} />
                  <TextInput label="Ano" value={questionForm.year} onChange={(year) => setQuestionForm((current) => ({ ...current, year }))} />
                  <Select label="Tipo" value={questionForm.kind} items={catalog.questionKinds.map((kind) => ({ id: kind, name: kind }))} onChange={(kind) => setQuestionForm((current) => ({ ...current, kind: kind as QuestionKind }))} />
                </div>
                <Textarea label="Enunciado" value={questionForm.statement} onChange={(statement) => setQuestionForm((current) => ({ ...current, statement }))} />
                {questionForm.kind !== "DISCURSIVE" && (
                  <>
                    <Textarea label="Alternativas, uma por linha" value={questionForm.alternativesText} onChange={(alternativesText) => setQuestionForm((current) => ({ ...current, alternativesText }))} />
                    <TextInput label="Gabarito" value={questionForm.correctAnswer} onChange={(correctAnswer) => setQuestionForm((current) => ({ ...current, correctAnswer }))} />
                  </>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <Select label="Materia" value={questionForm.subjectId} items={catalog.subjects} onChange={(subjectId) => setQuestionForm((current) => ({ ...current, subjectId, topicId: "" }))} />
                  <Select label="Assunto" value={questionForm.topicId} items={selectedQuestionSubject?.topics ?? []} onChange={(topicId) => setQuestionForm((current) => ({ ...current, topicId }))} />
                  <Select label="Banca" value={questionForm.boardId} items={catalog.boards} onChange={(boardId) => setQuestionForm((current) => ({ ...current, boardId }))} />
                  <Select label="Carreira" value={questionForm.careerId} items={catalog.careers} onChange={(careerId) => setQuestionForm((current) => ({ ...current, careerId }))} />
                  <Select label="Instituicao" value={questionForm.institutionId} items={catalog.institutions} onChange={(institutionId) => setQuestionForm((current) => ({ ...current, institutionId }))} />
                  <Select label="Cargo" value={questionForm.positionId} items={catalog.positions} onChange={(positionId) => setQuestionForm((current) => ({ ...current, positionId }))} />
                </div>
                <Textarea label="Explicacao" value={questionForm.explanation} onChange={(explanation) => setQuestionForm((current) => ({ ...current, explanation }))} />
                <Button disabled={saving} type="submit"><Plus className="h-4 w-4" /> Criar questao</Button>
              </form>
            </Panel>
            <Panel title="Simulados e questoes recentes">
              <form className="grid gap-3" onSubmit={submitSimulation}>
                <TextInput label="Titulo do simulado" value={simulationForm.title} onChange={(title) => setSimulationForm((current) => ({ ...current, title }))} />
                <div className="grid gap-3 md:grid-cols-3">
                  <TextInput label="Quantidade" value={simulationForm.questionCount} onChange={(questionCount) => setSimulationForm((current) => ({ ...current, questionCount }))} />
                  <Select label="Materia" value={simulationForm.subjectId} items={catalog.subjects} onChange={(subjectId) => setSimulationForm((current) => ({ ...current, subjectId, topicId: "" }))} />
                  <Select label="Assunto" value={simulationForm.topicId} items={selectedSimulationSubject?.topics ?? []} onChange={(topicId) => setSimulationForm((current) => ({ ...current, topicId }))} />
                </div>
                <Button disabled={saving} type="submit"><Target className="h-4 w-4" /> Montar simulado</Button>
              </form>
              <div className="mt-5 grid gap-3">
                {dashboard?.questions.map((question) => (
                  <article key={question.id} className="rounded-md border border-zinc-800 p-3">
                    <p className="text-xs uppercase text-zinc-500">{question.code} / {question.subject.name}</p>
                    <h3 className="line-clamp-2 font-semibold text-white">{question.statement}</h3>
                  </article>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {tab === "discursivas" && (
          <Panel title="Correcao de discursivas">
            <div className="grid gap-3">
              {dashboard?.essays.map((essay) => (
                <article key={essay.id} className="rounded-md border border-zinc-800 p-4">
                  <p className="text-xs uppercase text-zinc-500">{essay.question.code} / {essay.question.subject.name}</p>
                  <h3 className="mt-1 font-semibold text-white">{essay.student.fullName}</h3>
                  <p className="mt-3 rounded-md bg-zinc-900 p-3 text-sm leading-6 text-zinc-300">{essay.body}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr]">
                    <TextInput label="Nota" value={essayFeedback[essay.id]?.score ?? ""} onChange={(score) => setEssayFeedback((current) => ({ ...current, [essay.id]: { score, feedback: current[essay.id]?.feedback ?? "" } }))} />
                    <Textarea label="Feedback" value={essayFeedback[essay.id]?.feedback ?? ""} onChange={(feedback) => setEssayFeedback((current) => ({ ...current, [essay.id]: { score: current[essay.id]?.score ?? "", feedback } }))} />
                  </div>
                  <Button className="mt-3" disabled={saving} type="button" onClick={() => void submitEssayGrade(essay.id)}><CheckCircle2 className="h-4 w-4" /> Corrigir</Button>
                </article>
              ))}
              {dashboard?.essays.length === 0 && <Empty text="Nenhuma discursiva pendente." />}
            </div>
          </Panel>
        )}
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold uppercase text-white"><ShieldAlert className="h-4 w-4 text-foxtrot-400" /> {title}</h2>
      {children}
    </section>
  );
}

function TextInput({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase text-zinc-500">
      {label}
      <input className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-orange-500" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase text-zinc-500">
      {label}
      <textarea className="mt-1 min-h-24 w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-white outline-none focus:border-orange-500" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, items, onChange }: { label: string; value: string; items: Array<{ id: string; name: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase text-zinc-500">
      {label}
      <select className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-orange-500" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">{text}</p>;
}

function parseAlternatives(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^([A-Za-z0-9]+)[).:-]\s*(.+)$/);
      return { id: (match?.[1] ?? String.fromCharCode(65 + index)).toUpperCase(), text: match?.[2] ?? line };
    });
}
