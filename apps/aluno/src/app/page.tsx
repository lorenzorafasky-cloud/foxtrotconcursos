"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Flame, Loader2, PlayCircle, ShieldAlert, Target, Trophy } from "lucide-react";
import { Button, EmptyState, ErrorState, LoadingState, StatCard, useAuthSession } from "@foxtrot/ui";
import { CourseCard, CourseCardSkeleton, EnrolledCourseRow, fallbackCover } from "../components/CourseCard";
import { StudentNavigation } from "../components/StudentNavigation";
import {
  CourseEnrollment,
  CourseSummary,
  fetchCourseCatalog,
  fetchMyCourses,
  findNextLesson,
  formatMinutes,
  summarizeStudentCourses
} from "../lib/courses";

export default function StudentHome() {
  const session = useAuthSession();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [myCourses, setMyCourses] = useState<CourseEnrollment[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingStudentArea, setLoadingStudentArea] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [studentError, setStudentError] = useState("");

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") {
      void loadStudentArea();
      return;
    }
    if (session.status === "anonymous" || session.status === "forbidden") {
      setLoadingStudentArea(false);
      setMyCourses([]);
    }
  }, [session.status]);

  async function loadCatalog() {
    setLoadingCatalog(true);
    setCatalogError("");
    try {
      setCourses(await fetchCourseCatalog());
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Nao foi possivel carregar o catalogo.");
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function loadStudentArea() {
    setLoadingStudentArea(true);
    setStudentError("");
    try {
      setMyCourses(await fetchMyCourses());
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : "Nao foi possivel carregar suas matriculas.");
      setMyCourses([]);
    } finally {
      setLoadingStudentArea(false);
    }
  }

  const totals = useMemo(() => summarizeStudentCourses(myCourses), [myCourses]);
  const currentCourse = useMemo(
    () => [...myCourses].sort((a, b) => b.course.stats.progressPercent - a.course.stats.progressPercent)[0],
    [myCourses]
  );
  const nextLesson = currentCourse ? findNextLesson(currentCourse.course) : null;
  const catalogPreview = courses.slice(0, 4);

  return (
    <main className="min-h-screen bg-zinc-950">
      <StudentNavigation activeHref="/" />

      <section className="relative overflow-hidden border-b border-zinc-800">
        <img alt="Ambiente de estudos conectado" className="absolute inset-0 h-full w-full object-cover opacity-20" src={currentCourse?.course.coverImageUrl ?? fallbackCover} />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-950/70" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="font-display text-sm font-bold uppercase text-foxtrot-400">Painel do aluno</p>
            <h1 className="mt-3 max-w-3xl font-display text-5xl font-black uppercase leading-none text-white md:text-6xl">
              Foxtrot Concursos
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-7 text-zinc-300">
              Acompanhe seus cursos, retome aulas liberadas e navegue pelo catalogo conectado ao progresso da sua conta.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href={nextLesson ? `/aulas/${nextLesson.id}` : "/cursos"}>
                <PlayCircle className="h-4 w-4" aria-hidden /> {nextLesson ? "Retomar aula" : "Ver catalogo"}
              </Link>
              <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href="/foco">
                <Flame className="h-4 w-4" aria-hidden /> Iniciar foco
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard icon={<BookOpen className="h-4 w-4" />} label="Cursos matriculados" value={String(totals.enrolledCourses)} />
            <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Aulas concluidas" value={`${totals.completedLessons}/${totals.totalLessons}`} tone="green" />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Tempo assistido" value={formatMinutes(totals.watchedSeconds)} tone="blue" />
            <StatCard icon={<Trophy className="h-4 w-4" />} label="Progresso geral" value={`${totals.progressPercent}%`} tone="red" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-6">
          {session.status === "loading" && <LoadingState label="Validando sua sessao..." />}

          {session.status !== "loading" && !currentCourse && (
            <EmptyState
              title={session.status === "authenticated" ? "Nenhum curso iniciado" : "Entre para ver seu painel"}
              description={session.status === "authenticated" ? "Escolha um curso autorizado no catalogo para iniciar sua trilha." : "O painel mostra matriculas, progresso e aulas recentes depois do login."}
              action={
                session.status === "authenticated" ? (
                  <Link className="inline-flex h-10 items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/cursos">
                    Abrir catalogo
                  </Link>
                ) : (
                  <Link className="inline-flex h-10 items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/login?next=/">
                    Entrar
                  </Link>
                )
              }
            />
          )}

          {currentCourse && (
            <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-display text-sm font-bold uppercase text-foxtrot-400">Continuar estudando</p>
                  <h2 className="mt-2 font-display text-3xl font-black uppercase text-white">{currentCourse.course.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{currentCourse.course.description}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => window.location.assign(`/cursos/${currentCourse.course.slug}`)}>
                  <BookOpen className="h-4 w-4" aria-hidden /> Ver curso
                </Button>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{currentCourse.course.stats.completedLessons} aulas concluidas</span>
                  <span>{currentCourse.course.stats.progressPercent}%</span>
                </div>
                <div className="mt-2 h-2 rounded bg-zinc-800" aria-hidden>
                  <div className="h-2 rounded bg-foxtrot-500" style={{ width: `${currentCourse.course.stats.progressPercent}%` }} />
                </div>
              </div>
              {nextLesson && (
                <Link className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href={`/aulas/${nextLesson.id}`}>
                  <PlayCircle className="h-4 w-4" aria-hidden /> Retomar: {nextLesson.title}
                </Link>
              )}
            </section>
          )}

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-display text-sm font-bold uppercase text-foxtrot-400">Catalogo</p>
                <h2 className="mt-1 font-display text-3xl font-black uppercase text-white">Cursos publicados</h2>
              </div>
              <Link className="text-sm font-semibold text-foxtrot-300 hover:text-foxtrot-200" href="/cursos">
                Ver todos
              </Link>
            </div>
            {catalogError && <ErrorState title="Catalogo indisponivel" description={catalogError} action={<Button onClick={loadCatalog} type="button" variant="outline">Tentar novamente</Button>} />}
            {!catalogError && loadingCatalog && (
              <div className="grid gap-4 md:grid-cols-2">
                {[0, 1, 2, 3].map((item) => <CourseCardSkeleton key={item} />)}
              </div>
            )}
            {!catalogError && !loadingCatalog && catalogPreview.length === 0 && (
              <EmptyState title="Nenhum curso publicado" description="Assim que houver cursos liberados, eles aparecem aqui." />
            )}
            {!catalogError && !loadingCatalog && catalogPreview.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {catalogPreview.map((course) => (
                  <CourseCard course={course} enrolled={myCourses.some((enrollment) => enrollment.courseId === course.id)} key={course.id} compact />
                ))}
              </div>
            )}
          </section>
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase text-white">Minhas matriculas</h2>
            <div className="mt-4 grid gap-3">
              {loadingStudentArea && session.status === "authenticated" && <Loader2 className="h-5 w-5 animate-spin text-foxtrot-400" aria-label="Carregando matriculas" />}
              {studentError && (
                <div className="rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-100">
                  <ShieldAlert className="mr-2 inline h-4 w-4" aria-hidden />
                  {studentError}
                </div>
              )}
              {!loadingStudentArea && myCourses.map((enrollment) => <EnrolledCourseRow course={enrollment.course} key={enrollment.id} />)}
              {!loadingStudentArea && session.status === "authenticated" && myCourses.length === 0 && (
                <p className="text-sm text-zinc-400">Voce ainda nao iniciou nenhum curso.</p>
              )}
              {session.status !== "authenticated" && session.status !== "loading" && (
                <Link className="rounded-md border border-zinc-800 p-3 text-sm text-zinc-300 hover:border-foxtrot-500" href="/login?next=/">
                  Entre para sincronizar suas matriculas.
                </Link>
              )}
            </div>
          </section>
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase text-white">Indicadores</h2>
            <div className="mt-4 grid gap-3 text-sm text-zinc-300">
              <span className="rounded bg-zinc-900 p-3"><Target className="mr-2 inline h-4 w-4 text-foxtrot-400" aria-hidden /> {courses.length} cursos no catalogo</span>
              <span className="rounded bg-zinc-900 p-3"><Clock className="mr-2 inline h-4 w-4 text-foxtrot-400" aria-hidden /> {formatMinutes(totals.watchedSeconds)} assistidos</span>
              <span className="rounded bg-zinc-900 p-3"><CheckCircle2 className="mr-2 inline h-4 w-4 text-foxtrot-400" aria-hidden /> {totals.completedLessons} aulas concluidas</span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
