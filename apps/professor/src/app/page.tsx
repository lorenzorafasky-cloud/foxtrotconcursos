"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookMarked,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  GraduationCap,
  Layers3,
  Loader2,
  LogIn,
  LogOut,
  MessageSquareText,
  Plus,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Target,
  UploadCloud,
  Users,
  Video
} from "lucide-react";
import {
  Badge,
  BrandMark,
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
  Tabs,
  Textarea,
  cn,
  useAuthSession
} from "@foxtrot/ui";
import { apiRequest } from "../lib/api";
import {
  CourseStatus,
  LessonAssetType,
  ProfessorCatalog,
  ProfessorCourse,
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
  formatSeconds,
  gradeEssay,
  hasTeacherPermission,
  parseAlternatives,
  publishCourse,
  publishLesson,
  simulationAccuracy,
  slugFrom,
  summarizeProfessorDashboard,
  updateCourse,
  updateLesson,
  updateModule,
  validateCoursePayload,
  validateQuestionPayload
} from "../lib/professor";

type Tab = "inicio" | "cursos" | "aulas" | "materiais" | "questoes" | "simulados" | "duvidas" | "alunos" | "discursivas";
type Status = { type: "success" | "error" | "info"; message: string } | null;

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "inicio", label: "Inicio" },
  { id: "cursos", label: "Cursos" },
  { id: "aulas", label: "Aulas" },
  { id: "materiais", label: "Materiais" },
  { id: "questoes", label: "Questoes" },
  { id: "simulados", label: "Simulados" },
  { id: "duvidas", label: "Duvidas" },
  { id: "alunos", label: "Alunos" },
  { id: "discursivas", label: "Discursivas" }
];

export default function ProfessorHome() {
  const session = useAuthSession();
  const user = session.user;
  const [dashboard, setDashboard] = useState<ProfessorDashboard | null>(null);
  const [catalog, setCatalog] = useState<ProfessorCatalog | null>(null);
  const [tab, setTab] = useState<Tab>("inicio");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [essayFeedback, setEssayFeedback] = useState<Record<string, { score: string; feedback: string }>>({});
  const [courseForm, setCourseForm] = useState({
    id: "",
    title: "",
    slug: "",
    description: "",
    status: "PRE_EDITAL" as CourseStatus,
    careerId: "",
    boardId: "",
    area: "",
    coverImageUrl: "",
    workloadMinutes: "0"
  });
  const [moduleForm, setModuleForm] = useState({ id: "", courseId: "", title: "", position: "1" });
  const [lessonForm, setLessonForm] = useState({
    id: "",
    moduleId: "",
    subjectId: "",
    topicId: "",
    title: "",
    slug: "",
    description: "",
    position: "1",
    streamVideoUid: "",
    durationSeconds: "0"
  });
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
  const [simulationForm, setSimulationForm] = useState({
    title: "Simulado do professor",
    questionCount: "10",
    boardId: "",
    careerId: "",
    subjectId: "",
    topicId: "",
    year: "",
    kind: "" as QuestionKind | ""
  });

  const canPublish = hasTeacherPermission(user, "teacher:publish-lessons");
  const canQuestions = hasTeacherPermission(user, "teacher:answer-questions");
  const canGrade = hasTeacherPermission(user, "teacher:grade-essays");

  useEffect(() => {
    if (session.status === "authenticated") void reload();
    if (session.status === "anonymous") setStatus({ type: "info", message: "Entre com uma conta de professor." });
    if (session.status === "forbidden") setStatus({ type: "error", message: "Seu perfil nao tem acesso ao painel do professor." });
  }, [session.status]);

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
  const summary = useMemo(() => dashboard ? summarizeProfessorDashboard(dashboard) : null, [dashboard]);

  async function reload() {
    setLoading(true);
    setStatus(null);
    try {
      const [nextDashboard, nextCatalog] = await Promise.all([fetchProfessorDashboard(), fetchProfessorCatalog()]);
      setDashboard(nextDashboard);
      setCatalog(nextCatalog);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel carregar o painel do professor." });
    } finally {
      setLoading(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "info", message: "Autenticando..." });
    try {
      const result = await apiRequest<{ requiresTwoFactor?: boolean; emailVerificationRequired?: boolean }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode || undefined })
      });
      if (result.emailVerificationRequired) {
        setStatus({ type: "error", message: "Confirme o e-mail antes de acessar o painel." });
        return;
      }
      if (result.requiresTwoFactor) {
        setStatus({ type: "info", message: "Informe o codigo 2FA para concluir." });
        return;
      }
      await session.refresh();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Falha no login." });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await session.logout();
    setDashboard(null);
    setCatalog(null);
    setStatus({ type: "success", message: "Sessao encerrada." });
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setStatus(null);
    try {
      await action();
      setStatus({ type: "success", message: success });
      await reload();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel concluir a acao." });
    } finally {
      setSaving(false);
    }
  }

  async function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPublish) return setStatus({ type: "error", message: "Seu perfil nao tem permissao para gerenciar cursos." });
    const errors = validateCoursePayload(courseForm);
    const firstError = Object.values(errors)[0];
    if (firstError) return setStatus({ type: "error", message: firstError });
    const payload = {
      title: courseForm.title,
      slug: courseForm.slug,
      description: courseForm.description,
      status: courseForm.status,
      careerId: courseForm.careerId,
      boardId: courseForm.boardId || undefined,
      area: courseForm.area,
      coverImageUrl: courseForm.coverImageUrl || undefined,
      workloadMinutes: Number(courseForm.workloadMinutes || 0)
    };
    await runAction(() => (courseForm.id ? updateCourse(courseForm.id, payload) : createCourse(payload)), courseForm.id ? "Curso atualizado." : "Curso criado.");
    setCourseForm((current) => ({ ...current, id: "", title: "", slug: "", description: "", coverImageUrl: "" }));
  }

  async function submitModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPublish) return setStatus({ type: "error", message: "Seu perfil nao tem permissao para gerenciar modulos." });
    if (!moduleForm.courseId || !moduleForm.title.trim()) return setStatus({ type: "error", message: "Escolha o curso e informe o modulo." });
    const position = Math.max(1, Number(moduleForm.position || 1));
    await runAction(
      () => (moduleForm.id ? updateModule(moduleForm.id, { title: moduleForm.title, position }) : createModule({ courseId: moduleForm.courseId, title: moduleForm.title, position })),
      moduleForm.id ? "Modulo atualizado." : "Modulo criado."
    );
    setModuleForm((current) => ({ ...current, id: "", title: "" }));
  }

  async function submitLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPublish) return setStatus({ type: "error", message: "Seu perfil nao tem permissao para gerenciar aulas." });
    if (!lessonForm.moduleId || !lessonForm.subjectId || !lessonForm.title.trim() || !lessonForm.slug.trim() || !lessonForm.description.trim()) {
      setStatus({ type: "error", message: "Preencha modulo, materia, titulo, slug e descricao da aula." });
      return;
    }
    const payload = {
      moduleId: lessonForm.moduleId,
      subjectId: lessonForm.subjectId,
      topicId: lessonForm.topicId || undefined,
      title: lessonForm.title,
      slug: lessonForm.slug,
      description: lessonForm.description,
      streamVideoUid: lessonForm.streamVideoUid || undefined,
      durationSeconds: Number(lessonForm.durationSeconds || 0),
      position: Math.max(1, Number(lessonForm.position || 1))
    };
    await runAction(() => (lessonForm.id ? updateLesson(lessonForm.id, payload) : createLesson(payload)), lessonForm.id ? "Aula atualizada." : "Aula criada.");
    setLessonForm((current) => ({ ...current, id: "", title: "", slug: "", description: "", streamVideoUid: "" }));
  }

  async function submitMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPublish) return setStatus({ type: "error", message: "Seu perfil nao tem permissao para gerenciar materiais." });
    if (!materialForm.lessonId || !materialForm.url.trim()) return setStatus({ type: "error", message: "Escolha a aula e informe a URL/chave do material." });
    await runAction(
      () => createMaterial({ lessonId: materialForm.lessonId, type: materialForm.type, url: materialForm.url, metadata: { downloadable: materialForm.downloadable } }),
      "Material vinculado."
    );
    setMaterialForm((current) => ({ ...current, url: "" }));
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canQuestions) return setStatus({ type: "error", message: "Seu perfil nao tem permissao para criar questoes." });
    const errors = validateQuestionPayload(questionForm);
    const firstError = Object.values(errors)[0];
    if (firstError) return setStatus({ type: "error", message: firstError });
    await runAction(
      () =>
        createQuestion({
          code: questionForm.code,
          kind: questionForm.kind,
          statement: questionForm.statement,
          alternatives: questionForm.kind === "DISCURSIVE" ? undefined : parseAlternatives(questionForm.alternativesText),
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
    setQuestionForm((current) => ({ ...current, code: "", statement: "", correctAnswer: "", explanation: "" }));
  }

  async function submitSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canQuestions) return setStatus({ type: "error", message: "Seu perfil nao tem permissao para montar simulados." });
    if (!simulationForm.title.trim()) return setStatus({ type: "error", message: "Informe o titulo do simulado." });
    await runAction(
      () =>
        createProfessorSimulation({
          title: simulationForm.title,
          questionCount: Number(simulationForm.questionCount || 10),
          filters: {
            boardId: simulationForm.boardId || undefined,
            careerId: simulationForm.careerId || undefined,
            subjectId: simulationForm.subjectId || undefined,
            topicId: simulationForm.topicId || undefined,
            year: simulationForm.year || undefined,
            kind: simulationForm.kind || undefined
          }
        }),
      "Simulado montado."
    );
  }

  async function answerDoubt(doubtId: string) {
    if (!canQuestions) return setStatus({ type: "error", message: "Seu perfil nao tem permissao para responder duvidas." });
    const answer = answers[doubtId]?.trim();
    if (!answer) return setStatus({ type: "error", message: "Informe a resposta antes de enviar." });
    await runAction(() => answerLessonDoubt(doubtId, answer), "Resposta enviada ao aluno.");
    setAnswers((current) => ({ ...current, [doubtId]: "" }));
  }

  async function submitEssayGrade(essayId: string) {
    if (!canGrade) return setStatus({ type: "error", message: "Seu perfil nao tem permissao para corrigir discursivas." });
    const payload = essayFeedback[essayId];
    if (!payload?.feedback.trim() || !payload.score) return setStatus({ type: "error", message: "Informe nota e feedback da discursiva." });
    await runAction(() => gradeEssay(essayId, { finalScore: Number(payload.score), finalFeedback: payload.feedback }), "Discursiva corrigida.");
  }

  function selectCourse(course: ProfessorCourse) {
    setCourseForm({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      status: course.status,
      careerId: course.career.id,
      boardId: course.board?.id ?? "",
      area: course.area,
      coverImageUrl: "",
      workloadMinutes: "0"
    });
    setTab("cursos");
  }

  if (session.status === "loading") {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
        <LoadingState label="Validando sessao do professor..." />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-md border border-zinc-800 bg-zinc-950 p-6">
          <BrandMark />
          <h1 className="mt-8 font-display text-3xl font-black uppercase text-white">Professor</h1>
          <p className="mt-2 text-sm text-zinc-400">Acesse para criar conteudo, acompanhar alunos e responder interacoes.</p>
          <Field label="E-mail" htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <div className="mt-3">
            <Field label="Senha" htmlFor="password">
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Codigo 2FA" htmlFor="two-factor-code" hint="Obrigatorio apenas quando a conta exigir.">
              <Input id="two-factor-code" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} />
            </Field>
          </div>
          <Button className="mt-6 w-full" disabled={saving || !email.trim() || !password.trim()} type="submit">
            <LogIn className="h-4 w-4" aria-hidden /> Entrar
          </Button>
          {status && <StatusMessage status={status} />}
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <BrandMark />
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={canPublish || canQuestions || canGrade ? "success" : "warning"}>{user.nickname}</Badge>
            <Button type="button" variant="ghost" onClick={() => void reload()}>
              <RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden /> Atualizar
            </Button>
            <Button type="button" variant="ghost" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" aria-hidden /> Sair
            </Button>
          </div>
        </div>
        <div className="border-t border-zinc-900 px-4 pb-3">
          <div className="mx-auto max-w-7xl">
            <Tabs items={tabs} value={tab} onChange={setTab} />
          </div>
        </div>
      </header>

      <PageHeader
        eyebrow="Painel do professor"
        title="Operacao academica"
        description="Gerencie cursos, modulos, aulas, materiais, questoes, simulados, duvidas, alunos e discursivas no escopo da sua conta."
        actions={
          <>
            <PermissionPill label="Conteudo" allowed={canPublish} />
            <PermissionPill label="Questoes" allowed={canQuestions} />
            <PermissionPill label="Discursivas" allowed={canGrade} />
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {status && <StatusMessage status={status} />}
        {loading && !dashboard ? (
          <LoadingState label="Carregando painel do professor..." />
        ) : dashboard && catalog && summary ? (
          <div className="grid gap-6">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={<BookMarked className="h-4 w-4" aria-hidden />} label="Cursos publicados" value={`${summary.publishedCourses}/${summary.courses}`} />
              <StatCard icon={<Video className="h-4 w-4" aria-hidden />} label="Aulas publicadas" value={`${summary.publishedLessons}/${summary.lessons}`} tone="blue" />
              <StatCard icon={<MessageSquareText className="h-4 w-4" aria-hidden />} label="Duvidas abertas" value={String(summary.pendingDoubts)} tone="red" />
              <StatCard icon={<FilePenLine className="h-4 w-4" aria-hidden />} label="Discursivas" value={String(summary.pendingEssays)} tone="zinc" />
              <StatCard icon={<Users className="h-4 w-4" aria-hidden />} label="Progresso medio" value={`${summary.averageProgress}%`} tone="green" />
            </section>

            {tab === "inicio" && (
              <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Fila de trabalho</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <QueueButton icon={<MessageSquareText className="h-5 w-5" aria-hidden />} label="Responder duvidas" value={summary.pendingDoubts} onClick={() => setTab("duvidas")} />
                    <QueueButton icon={<FilePenLine className="h-5 w-5" aria-hidden />} label="Corrigir discursivas" value={summary.pendingEssays} onClick={() => setTab("discursivas")} />
                    <QueueButton icon={<Target className="h-5 w-5" aria-hidden />} label="Questoes recentes" value={summary.questions} onClick={() => setTab("questoes")} />
                  </div>
                  <h3 className="mt-6 font-display text-lg font-bold uppercase text-white">Conteudo recente</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {lessons.slice(0, 6).map((lesson) => (
                      <article key={lesson.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase text-zinc-500">{lesson.subject?.name ?? "Materia"} / {lesson.publishedAt ? "Publicada" : "Rascunho"}</p>
                            <h4 className="mt-1 font-semibold text-white">{lesson.title}</h4>
                            <p className="mt-1 text-sm text-zinc-400">{formatSeconds(lesson.durationSeconds)}</p>
                          </div>
                          <Badge tone={lesson.publishedAt ? "success" : "warning"}>{lesson.publishedAt ? "Publicado" : "Rascunho"}</Badge>
                        </div>
                      </article>
                    ))}
                    {lessons.length === 0 && <EmptyState title="Sem aulas" description="Aulas criadas pela sua conta aparecem aqui." />}
                  </div>
                </Card>
                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Permissoes ativas</h2>
                  <div className="mt-4 grid gap-3">
                    <PermissionRow label="Criar e publicar cursos, modulos, aulas e materiais" allowed={canPublish} />
                    <PermissionRow label="Criar questoes, montar simulados e responder duvidas" allowed={canQuestions} />
                    <PermissionRow label="Corrigir respostas discursivas" allowed={canGrade} />
                  </div>
                </Card>
              </section>
            )}

            {tab === "cursos" && (
              <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">{courseForm.id ? "Editar curso" : "Novo curso"}</h2>
                  {!canPublish && <LockedNotice text="Seu perfil nao pode criar ou editar cursos." />}
                  <form className="mt-4 grid gap-3" onSubmit={submitCourse}>
                    <Field label="Titulo" htmlFor="course-title">
                      <Input id="course-title" disabled={!canPublish} value={courseForm.title} onChange={(event) => setCourseForm((current) => ({ ...current, title: event.target.value, slug: current.slug || slugFrom(event.target.value) }))} />
                    </Field>
                    <Field label="Slug" htmlFor="course-slug">
                      <Input id="course-slug" disabled={!canPublish} value={courseForm.slug} onChange={(event) => setCourseForm((current) => ({ ...current, slug: event.target.value }))} />
                    </Field>
                    <Field label="Descricao" htmlFor="course-description">
                      <Textarea id="course-description" disabled={!canPublish} value={courseForm.description} onChange={(event) => setCourseForm((current) => ({ ...current, description: event.target.value }))} />
                    </Field>
                    <div className="grid gap-3 md:grid-cols-2">
                      <CatalogSelect label="Carreira" id="course-career" disabled={!canPublish} value={courseForm.careerId} items={catalog.careers} onChange={(careerId) => setCourseForm((current) => ({ ...current, careerId }))} />
                      <CatalogSelect label="Banca" id="course-board" disabled={!canPublish} value={courseForm.boardId} items={catalog.boards} onChange={(boardId) => setCourseForm((current) => ({ ...current, boardId }))} />
                      <Field label="Area" htmlFor="course-area">
                        <Input id="course-area" disabled={!canPublish} value={courseForm.area} onChange={(event) => setCourseForm((current) => ({ ...current, area: event.target.value }))} />
                      </Field>
                      <CatalogSelect label="Status" id="course-status" disabled={!canPublish} value={courseForm.status} items={catalog.courseStatuses.map((item) => ({ id: item, name: item }))} onChange={(statusValue) => setCourseForm((current) => ({ ...current, status: statusValue as CourseStatus }))} />
                    </div>
                    <Field label="Carga horaria em minutos" htmlFor="course-workload">
                      <Input id="course-workload" disabled={!canPublish} min="0" type="number" value={courseForm.workloadMinutes} onChange={(event) => setCourseForm((current) => ({ ...current, workloadMinutes: event.target.value }))} />
                    </Field>
                    <Button disabled={saving || !canPublish} type="submit">
                      <Save className="h-4 w-4" aria-hidden /> {courseForm.id ? "Atualizar" : "Criar curso"}
                    </Button>
                  </form>
                </Card>
                <CourseList courses={catalog.courses} canPublish={canPublish} saving={saving} onEdit={selectCourse} onPublish={(id) => void runAction(() => publishCourse(id), "Curso publicado.")} />
              </section>
            )}

            {tab === "aulas" && (
              <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">{lessonForm.id ? "Editar aula" : "Nova aula"}</h2>
                  {!canPublish && <LockedNotice text="Seu perfil nao pode criar ou editar aulas." />}
                  <form className="mt-4 grid gap-3" onSubmit={submitModule}>
                    <CatalogSelect label="Curso" id="module-course" disabled={!canPublish} value={moduleForm.courseId} items={catalog.courses.map((course) => ({ id: course.id, name: course.title }))} onChange={(courseId) => setModuleForm((current) => ({ ...current, courseId }))} />
                    <div className="grid gap-3 md:grid-cols-[1fr_110px]">
                      <Field label="Modulo" htmlFor="module-title">
                        <Input id="module-title" disabled={!canPublish} value={moduleForm.title} onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))} />
                      </Field>
                      <Field label="Ordem" htmlFor="module-position">
                        <Input id="module-position" disabled={!canPublish} min="1" type="number" value={moduleForm.position} onChange={(event) => setModuleForm((current) => ({ ...current, position: event.target.value }))} />
                      </Field>
                    </div>
                    <Button disabled={saving || !canPublish} type="submit" variant="ghost">
                      <Layers3 className="h-4 w-4" aria-hidden /> {moduleForm.id ? "Atualizar modulo" : "Criar modulo"}
                    </Button>
                  </form>

                  <form className="mt-6 grid gap-3 border-t border-zinc-800 pt-4" onSubmit={submitLesson}>
                    <CatalogSelect label="Modulo" id="lesson-module" disabled={!canPublish} value={lessonForm.moduleId} items={modules.map((module) => ({ id: module.id, name: `${module.courseTitle} / ${module.title}` }))} onChange={(moduleId) => setLessonForm((current) => ({ ...current, moduleId }))} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <CatalogSelect label="Materia" id="lesson-subject" disabled={!canPublish} value={lessonForm.subjectId} items={catalog.subjects} onChange={(subjectId) => setLessonForm((current) => ({ ...current, subjectId, topicId: "" }))} />
                      <CatalogSelect label="Assunto" id="lesson-topic" disabled={!canPublish || !lessonForm.subjectId} value={lessonForm.topicId} items={selectedLessonSubject?.topics ?? []} onChange={(topicId) => setLessonForm((current) => ({ ...current, topicId }))} />
                    </div>
                    <Field label="Titulo da aula" htmlFor="lesson-title">
                      <Input id="lesson-title" disabled={!canPublish} value={lessonForm.title} onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value, slug: current.slug || slugFrom(event.target.value) }))} />
                    </Field>
                    <Field label="Slug da aula" htmlFor="lesson-slug">
                      <Input id="lesson-slug" disabled={!canPublish} value={lessonForm.slug} onChange={(event) => setLessonForm((current) => ({ ...current, slug: event.target.value }))} />
                    </Field>
                    <Field label="Descricao" htmlFor="lesson-description">
                      <Textarea id="lesson-description" disabled={!canPublish} value={lessonForm.description} onChange={(event) => setLessonForm((current) => ({ ...current, description: event.target.value }))} />
                    </Field>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="Ordem" htmlFor="lesson-position">
                        <Input id="lesson-position" disabled={!canPublish} min="1" type="number" value={lessonForm.position} onChange={(event) => setLessonForm((current) => ({ ...current, position: event.target.value }))} />
                      </Field>
                      <Field label="Duracao seg." htmlFor="lesson-duration">
                        <Input id="lesson-duration" disabled={!canPublish} min="0" type="number" value={lessonForm.durationSeconds} onChange={(event) => setLessonForm((current) => ({ ...current, durationSeconds: event.target.value }))} />
                      </Field>
                      <Field label="Video UID" htmlFor="lesson-video">
                        <Input id="lesson-video" disabled={!canPublish} value={lessonForm.streamVideoUid} onChange={(event) => setLessonForm((current) => ({ ...current, streamVideoUid: event.target.value }))} />
                      </Field>
                    </div>
                    <Button disabled={saving || !canPublish} type="submit">
                      <Video className="h-4 w-4" aria-hidden /> {lessonForm.id ? "Atualizar aula" : "Criar aula"}
                    </Button>
                  </form>
                </Card>
                <LessonList lessons={lessons} canPublish={canPublish} saving={saving} onEdit={(lesson) => {
                  setLessonForm({
                    id: lesson.id,
                    moduleId: lesson.moduleId,
                    subjectId: lesson.subjectId,
                    topicId: lesson.topic?.id ?? "",
                    title: lesson.title,
                    slug: lesson.slug,
                    description: lesson.description,
                    position: String(lesson.position),
                    streamVideoUid: lesson.streamVideoUid ?? "",
                    durationSeconds: String(lesson.durationSeconds ?? 0)
                  });
                }} onPublish={(id) => void runAction(() => publishLesson(id), "Aula publicada.")} />
              </section>
            )}

            {tab === "materiais" && (
              <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Vincular material</h2>
                  {!canPublish && <LockedNotice text="Seu perfil nao pode gerenciar materiais." />}
                  <form className="mt-4 grid gap-3" onSubmit={submitMaterial}>
                    <CatalogSelect label="Aula" id="material-lesson" disabled={!canPublish} value={materialForm.lessonId} items={lessons.map((lesson) => ({ id: lesson.id, name: lesson.title }))} onChange={(lessonId) => setMaterialForm((current) => ({ ...current, lessonId }))} />
                    <CatalogSelect label="Tipo" id="material-type" disabled={!canPublish} value={materialForm.type} items={catalog.assetTypes.map((type) => ({ id: type, name: type }))} onChange={(type) => setMaterialForm((current) => ({ ...current, type: type as LessonAssetType }))} />
                    <Field label="URL ou chave de armazenamento" htmlFor="material-url">
                      <Input id="material-url" disabled={!canPublish} value={materialForm.url} onChange={(event) => setMaterialForm((current) => ({ ...current, url: event.target.value }))} />
                    </Field>
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                      <input className="h-4 w-4 accent-orange-500" checked={materialForm.downloadable} disabled={!canPublish} type="checkbox" onChange={(event) => setMaterialForm((current) => ({ ...current, downloadable: event.target.checked }))} />
                      Download permitido
                    </label>
                    <Button disabled={saving || !canPublish} type="submit">
                      <UploadCloud className="h-4 w-4" aria-hidden /> Vincular material
                    </Button>
                  </form>
                </Card>
                <MaterialList lessons={lessons} />
              </section>
            )}

            {tab === "questoes" && (
              <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Criar questao</h2>
                  {!canQuestions && <LockedNotice text="Seu perfil nao pode criar questoes." />}
                  <form className="mt-4 grid gap-3" onSubmit={submitQuestion}>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="Codigo" htmlFor="question-code">
                        <Input id="question-code" disabled={!canQuestions} value={questionForm.code} onChange={(event) => setQuestionForm((current) => ({ ...current, code: event.target.value }))} />
                      </Field>
                      <Field label="Ano" htmlFor="question-year">
                        <Input id="question-year" disabled={!canQuestions} min="1900" type="number" value={questionForm.year} onChange={(event) => setQuestionForm((current) => ({ ...current, year: event.target.value }))} />
                      </Field>
                      <CatalogSelect label="Tipo" id="question-kind" disabled={!canQuestions} value={questionForm.kind} items={catalog.questionKinds.map((kind) => ({ id: kind, name: kind }))} onChange={(kind) => setQuestionForm((current) => ({ ...current, kind: kind as QuestionKind }))} />
                    </div>
                    <Field label="Enunciado" htmlFor="question-statement">
                      <Textarea id="question-statement" disabled={!canQuestions} value={questionForm.statement} onChange={(event) => setQuestionForm((current) => ({ ...current, statement: event.target.value }))} />
                    </Field>
                    {questionForm.kind !== "DISCURSIVE" && (
                      <>
                        <Field label="Alternativas, uma por linha" htmlFor="question-alternatives">
                          <Textarea id="question-alternatives" disabled={!canQuestions} value={questionForm.alternativesText} onChange={(event) => setQuestionForm((current) => ({ ...current, alternativesText: event.target.value }))} />
                        </Field>
                        <Field label="Gabarito" htmlFor="question-answer">
                          <Input id="question-answer" disabled={!canQuestions} value={questionForm.correctAnswer} onChange={(event) => setQuestionForm((current) => ({ ...current, correctAnswer: event.target.value }))} />
                        </Field>
                      </>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      <CatalogSelect label="Materia" id="question-subject" disabled={!canQuestions} value={questionForm.subjectId} items={catalog.subjects} onChange={(subjectId) => setQuestionForm((current) => ({ ...current, subjectId, topicId: "" }))} />
                      <CatalogSelect label="Assunto" id="question-topic" disabled={!canQuestions || !questionForm.subjectId} value={questionForm.topicId} items={selectedQuestionSubject?.topics ?? []} onChange={(topicId) => setQuestionForm((current) => ({ ...current, topicId }))} />
                      <CatalogSelect label="Banca" id="question-board" disabled={!canQuestions} value={questionForm.boardId} items={catalog.boards} onChange={(boardId) => setQuestionForm((current) => ({ ...current, boardId }))} />
                      <CatalogSelect label="Carreira" id="question-career" disabled={!canQuestions} value={questionForm.careerId} items={catalog.careers} onChange={(careerId) => setQuestionForm((current) => ({ ...current, careerId }))} />
                      <CatalogSelect label="Instituicao" id="question-institution" disabled={!canQuestions} value={questionForm.institutionId} items={catalog.institutions} onChange={(institutionId) => setQuestionForm((current) => ({ ...current, institutionId }))} />
                      <CatalogSelect label="Cargo" id="question-position" disabled={!canQuestions} value={questionForm.positionId} items={catalog.positions} onChange={(positionId) => setQuestionForm((current) => ({ ...current, positionId }))} />
                    </div>
                    <Field label="Explicacao" htmlFor="question-explanation">
                      <Textarea id="question-explanation" disabled={!canQuestions} value={questionForm.explanation} onChange={(event) => setQuestionForm((current) => ({ ...current, explanation: event.target.value }))} />
                    </Field>
                    <Button disabled={saving || !canQuestions} type="submit">
                      <Plus className="h-4 w-4" aria-hidden /> Criar questao
                    </Button>
                  </form>
                </Card>
                <QuestionList questions={dashboard.questions} />
              </section>
            )}

            {tab === "simulados" && (
              <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Montar simulado</h2>
                  {!canQuestions && <LockedNotice text="Seu perfil nao pode montar simulados." />}
                  <form className="mt-4 grid gap-3" onSubmit={submitSimulation}>
                    <Field label="Titulo" htmlFor="simulation-title">
                      <Input id="simulation-title" disabled={!canQuestions} value={simulationForm.title} onChange={(event) => setSimulationForm((current) => ({ ...current, title: event.target.value }))} />
                    </Field>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Quantidade" htmlFor="simulation-count">
                        <Input id="simulation-count" disabled={!canQuestions} max="100" min="1" type="number" value={simulationForm.questionCount} onChange={(event) => setSimulationForm((current) => ({ ...current, questionCount: event.target.value }))} />
                      </Field>
                      <CatalogSelect label="Tipo" id="simulation-kind" disabled={!canQuestions} value={simulationForm.kind} items={catalog.questionKinds.map((kind) => ({ id: kind, name: kind }))} onChange={(kind) => setSimulationForm((current) => ({ ...current, kind: kind as QuestionKind | "" }))} />
                      <CatalogSelect label="Materia" id="simulation-subject" disabled={!canQuestions} value={simulationForm.subjectId} items={catalog.subjects} onChange={(subjectId) => setSimulationForm((current) => ({ ...current, subjectId, topicId: "" }))} />
                      <CatalogSelect label="Assunto" id="simulation-topic" disabled={!canQuestions || !simulationForm.subjectId} value={simulationForm.topicId} items={selectedSimulationSubject?.topics ?? []} onChange={(topicId) => setSimulationForm((current) => ({ ...current, topicId }))} />
                      <CatalogSelect label="Banca" id="simulation-board" disabled={!canQuestions} value={simulationForm.boardId} items={catalog.boards} onChange={(boardId) => setSimulationForm((current) => ({ ...current, boardId }))} />
                      <CatalogSelect label="Carreira" id="simulation-career" disabled={!canQuestions} value={simulationForm.careerId} items={catalog.careers} onChange={(careerId) => setSimulationForm((current) => ({ ...current, careerId }))} />
                    </div>
                    <Button disabled={saving || !canQuestions} type="submit">
                      <Target className="h-4 w-4" aria-hidden /> Montar simulado
                    </Button>
                  </form>
                </Card>
                <SimulationList simulations={dashboard.simulations} />
              </section>
            )}

            {tab === "duvidas" && (
              <Card>
                <h2 className="font-display text-xl font-bold uppercase text-white">Duvidas por aula</h2>
                {!canQuestions && <LockedNotice text="Seu perfil nao pode responder duvidas." />}
                <div className="mt-4 grid gap-3">
                  {dashboard.doubts.map((doubt) => (
                    <article key={doubt.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-xs uppercase text-zinc-500">{doubt.lesson.module?.course?.title ?? "Curso"} / {doubt.lesson.title}</p>
                      <h3 className="mt-1 font-semibold text-white">{doubt.user.fullName}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{doubt.message}</p>
                      <div className="mt-3">
                        <Field label="Resposta" htmlFor={`doubt-${doubt.id}`}>
                          <Textarea id={`doubt-${doubt.id}`} disabled={!canQuestions} value={answers[doubt.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [doubt.id]: event.target.value }))} />
                        </Field>
                      </div>
                      <Button className="mt-3" disabled={saving || !canQuestions} type="button" onClick={() => void answerDoubt(doubt.id)}>
                        <Send className="h-4 w-4" aria-hidden /> Responder
                      </Button>
                    </article>
                  ))}
                  {dashboard.doubts.length === 0 && <EmptyState title="Sem duvidas abertas" description="Novas perguntas de alunos aparecem nesta fila." />}
                </div>
              </Card>
            )}

            {tab === "alunos" && <StudentProgressList students={dashboard.students} />}

            {tab === "discursivas" && (
              <Card>
                <h2 className="font-display text-xl font-bold uppercase text-white">Correcao de discursivas</h2>
                {!canGrade && <LockedNotice text="Seu perfil nao pode corrigir discursivas." />}
                <div className="mt-4 grid gap-3">
                  {dashboard.essays.map((essay) => (
                    <article key={essay.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-xs uppercase text-zinc-500">{essay.question.code} / {essay.question.subject.name}</p>
                      <h3 className="mt-1 font-semibold text-white">{essay.student.fullName}</h3>
                      <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{essay.question.statement}</p>
                      <p className="mt-3 rounded-md bg-zinc-950 p-3 text-sm leading-6 text-zinc-300">{essay.body}</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-[140px_1fr]">
                        <Field label="Nota" htmlFor={`essay-score-${essay.id}`}>
                          <Input id={`essay-score-${essay.id}`} disabled={!canGrade} min="0" type="number" value={essayFeedback[essay.id]?.score ?? ""} onChange={(event) => setEssayFeedback((current) => ({ ...current, [essay.id]: { score: event.target.value, feedback: current[essay.id]?.feedback ?? "" } }))} />
                        </Field>
                        <Field label="Feedback" htmlFor={`essay-feedback-${essay.id}`}>
                          <Textarea id={`essay-feedback-${essay.id}`} disabled={!canGrade} value={essayFeedback[essay.id]?.feedback ?? ""} onChange={(event) => setEssayFeedback((current) => ({ ...current, [essay.id]: { score: current[essay.id]?.score ?? "", feedback: event.target.value } }))} />
                        </Field>
                      </div>
                      <Button className="mt-3" disabled={saving || !canGrade} type="button" onClick={() => void submitEssayGrade(essay.id)}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden /> Corrigir
                      </Button>
                    </article>
                  ))}
                  {dashboard.essays.length === 0 && <EmptyState title="Sem discursivas pendentes" description="Respostas aguardando correcao aparecem aqui." />}
                </div>
              </Card>
            )}
          </div>
        ) : (
          !loading && <ErrorState description="A API nao retornou dados suficientes para montar o painel." action={<Button type="button" variant="outline" onClick={() => void reload()}>Recarregar</Button>} />
        )}
      </div>
    </main>
  );
}

function StatusMessage({ status }: { status: NonNullable<Status> }) {
  return (
    <p
      className={cn(
        "mb-4 rounded-md border p-3 text-sm",
        status.type === "success" && "border-emerald-900 bg-emerald-950/40 text-emerald-100",
        status.type === "error" && "border-red-900 bg-red-950/40 text-red-100",
        status.type === "info" && "border-zinc-800 bg-zinc-900 text-zinc-300"
      )}
      role={status.type === "error" ? "alert" : "status"}
    >
      {status.message}
    </p>
  );
}

function PermissionPill({ label, allowed }: { label: string; allowed: boolean }) {
  return <Badge tone={allowed ? "success" : "warning"}>{label}: {allowed ? "liberado" : "bloqueado"}</Badge>;
}

function PermissionRow({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 p-3 text-sm">
      <span className="text-zinc-300">{label}</span>
      <Badge tone={allowed ? "success" : "warning"}>{allowed ? "Ativa" : "Sem acesso"}</Badge>
    </div>
  );
}

function LockedNotice({ text }: { text: string }) {
  return (
    <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {text}
    </p>
  );
}

function QueueButton({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: number; onClick: () => void }) {
  return (
    <button className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-left hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foxtrot-500" type="button" onClick={onClick}>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-foxtrot-500/15 text-foxtrot-400">{icon}</span>
      <strong className="mt-3 block font-display text-3xl text-white">{value}</strong>
      <span className="text-sm text-zinc-400">{label}</span>
    </button>
  );
}

function CatalogSelect({ label, id, value, items, disabled, onChange }: { label: string; id: string; value: string; items: Array<{ id: string; name: string }>; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <Field label={label} htmlFor={id}>
      <Select id={id} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
    </Field>
  );
}

function CourseList({ courses, canPublish, saving, onEdit, onPublish }: { courses: ProfessorCourse[]; canPublish: boolean; saving: boolean; onEdit: (course: ProfessorCourse) => void; onPublish: (id: string) => void }) {
  return (
    <Card>
      <h2 className="font-display text-xl font-bold uppercase text-white">Cursos e modulos</h2>
      <div className="mt-4 grid gap-3">
        {courses.map((course) => (
          <article key={course.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-zinc-500">{course.career.name} / {course.status}</p>
                <h3 className="font-semibold text-white">{course.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{course.modules.length} modulos / {course.modules.reduce((sum, module) => sum + module.lessons.length, 0)} aulas</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" type="button" variant="ghost" onClick={() => onEdit(course)}>Editar</Button>
                {!course.publishedAt && <Button disabled={saving || !canPublish} size="sm" type="button" variant="outline" onClick={() => onPublish(course.id)}>Publicar</Button>}
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {course.modules.map((module) => (
                <div key={module.id} className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                  {module.position}. {module.title} <span className="text-zinc-500">/ {module.lessons.length} aulas</span>
                </div>
              ))}
            </div>
          </article>
        ))}
        {courses.length === 0 && <EmptyState title="Sem cursos" description="Crie o primeiro curso para organizar modulos e aulas." />}
      </div>
    </Card>
  );
}

function LessonList({ lessons, canPublish, saving, onEdit, onPublish }: { lessons: ProfessorDashboard["lessons"]; canPublish: boolean; saving: boolean; onEdit: (lesson: ProfessorDashboard["lessons"][number]) => void; onPublish: (id: string) => void }) {
  return (
    <Card>
      <h2 className="font-display text-xl font-bold uppercase text-white">Aulas</h2>
      <div className="mt-4 grid gap-3">
        {lessons.map((lesson) => (
          <article key={lesson.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-zinc-500">{lesson.subject?.name ?? "Materia"} / {formatSeconds(lesson.durationSeconds)}</p>
                <h3 className="font-semibold text-white">{lesson.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{lesson.assets?.length ?? 0} materiais / {lesson.streamVideoUid ? "video configurado" : "sem video"}</p>
              </div>
              <Badge tone={lesson.publishedAt ? "success" : "warning"}>{lesson.publishedAt ? "Publicada" : "Rascunho"}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" type="button" variant="ghost" onClick={() => onEdit(lesson)}>Editar</Button>
              {!lesson.publishedAt && <Button disabled={saving || !canPublish} size="sm" type="button" variant="outline" onClick={() => onPublish(lesson.id)}>Publicar aula</Button>}
            </div>
          </article>
        ))}
        {lessons.length === 0 && <EmptyState title="Sem aulas" description="Crie aulas a partir dos modulos cadastrados." />}
      </div>
    </Card>
  );
}

function MaterialList({ lessons }: { lessons: ProfessorDashboard["lessons"] }) {
  const materialRows = lessons.flatMap((lesson) => (lesson.assets ?? []).map((asset) => ({ ...asset, lessonTitle: lesson.title })));
  return (
    <Card>
      <h2 className="font-display text-xl font-bold uppercase text-white">Materiais vinculados</h2>
      <div className="mt-4 grid gap-3">
        {materialRows.map((asset) => (
          <article key={asset.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase text-zinc-500">{asset.type} / {asset.lessonTitle}</p>
            <p className="mt-1 break-all text-sm text-zinc-300">{asset.url}</p>
          </article>
        ))}
        {materialRows.length === 0 && <EmptyState title="Sem materiais" description="PDFs, slides, transcricoes e outros materiais aparecem aqui." />}
      </div>
    </Card>
  );
}

function QuestionList({ questions }: { questions: ProfessorDashboard["questions"] }) {
  return (
    <Card>
      <h2 className="font-display text-xl font-bold uppercase text-white">Questoes recentes</h2>
      <div className="mt-4 grid gap-3">
        {questions.map((question) => (
          <article key={question.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase text-zinc-500">{question.code} / {question.kind} / {question.subject.name}</p>
            <h3 className="mt-1 line-clamp-3 font-semibold text-white">{question.statement}</h3>
            <p className="mt-2 text-sm text-zinc-400">{question.board.name} / {question.career.name} / {question.year}</p>
          </article>
        ))}
        {questions.length === 0 && <EmptyState title="Sem questoes" description="Questoes criadas no seu escopo aparecem aqui." />}
      </div>
    </Card>
  );
}

function SimulationList({ simulations }: { simulations: ProfessorDashboard["simulations"] }) {
  return (
    <Card>
      <h2 className="font-display text-xl font-bold uppercase text-white">Simulados</h2>
      <div className="mt-4 grid gap-3">
        {simulations.map((simulation) => (
          <article key={simulation.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-zinc-500">{simulation.status} / {simulation.questionCount} questoes</p>
                <h3 className="font-semibold text-white">{simulation.title}</h3>
              </div>
              <Badge tone="brand">{simulationAccuracy(simulation)}%</Badge>
            </div>
            <p className="mt-2 text-sm text-zinc-400">{simulation.attempts.length} respostas registradas</p>
          </article>
        ))}
        {simulations.length === 0 && <EmptyState title="Sem simulados" description="Monte simulados a partir das questoes do seu escopo." />}
      </div>
    </Card>
  );
}

function StudentProgressList({ students }: { students: ProfessorDashboard["students"] }) {
  return (
    <Card>
      <h2 className="font-display text-xl font-bold uppercase text-white">Acompanhamento de desempenho</h2>
      <div className="mt-4 grid gap-3">
        {students.map((student) => (
          <article key={student.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">{student.user.fullName}</h3>
                <p className="text-sm text-zinc-400">{student.course.title}</p>
              </div>
              <strong className="text-foxtrot-400">{student.stats.progressPercent}%</strong>
            </div>
            <div className="mt-3 h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-foxtrot-500" style={{ width: `${student.stats.progressPercent}%` }} /></div>
            <div className="mt-3 grid gap-2 text-sm text-zinc-400 md:grid-cols-3">
              <span><GraduationCap className="mr-1 inline h-4 w-4" aria-hidden /> {student.stats.completedLessons}/{student.stats.lessonCount} aulas</span>
              <span><BarChart3 className="mr-1 inline h-4 w-4" aria-hidden /> {formatSeconds(student.stats.watchedSeconds)}</span>
              <span><ClipboardList className="mr-1 inline h-4 w-4" aria-hidden /> {student.user.email}</span>
            </div>
          </article>
        ))}
        {students.length === 0 && <EmptyState title="Sem alunos" description="Matriculas vinculadas aos seus cursos aparecem aqui." />}
      </div>
    </Card>
  );
}
