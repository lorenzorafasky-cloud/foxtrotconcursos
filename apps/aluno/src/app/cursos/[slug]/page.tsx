"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Loader2, Lock, PlayCircle, ShieldAlert } from "lucide-react";
import { Badge, Button, EmptyState, ErrorState, LoadingState, StatCard, useAuthSession } from "@foxtrot/ui";
import { CourseModules } from "../../../components/CourseModules";
import { StudentNavigation } from "../../../components/StudentNavigation";
import { fallbackCover } from "../../../components/CourseCard";
import {
  CourseDetail,
  courseStatusLabel,
  enrollInCourse,
  fetchCourseDetail,
  findNextLesson,
  formatMinutes,
  progressLabel
} from "../../../lib/courses";

export default function CourseDetailPage({ params }: { params: { slug: string } }) {
  const session = useAuthSession();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void load();
  }, [params.slug]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setCourse(await fetchCourseDetail(params.slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o curso.");
    } finally {
      setLoading(false);
    }
  }

  async function enroll() {
    if (!course) return;
    setEnrolling(true);
    setNotice("");
    try {
      await enrollInCourse(course.slug);
      setNotice("Matricula ativa. As aulas publicadas ja estao liberadas.");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Nao foi possivel concluir a matricula.");
    } finally {
      setEnrolling(false);
    }
  }

  const nextLesson = useMemo(() => (course ? findNextLesson(course) : null), [course]);
  const canOpenLessons = Boolean(course?.allowed && course.enrolled);

  return (
    <main className="min-h-screen bg-zinc-950">
      <StudentNavigation activeHref="/cursos" />

      {loading && (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <LoadingState label="Carregando curso..." />
          <div className="h-64 animate-pulse rounded-md border border-zinc-800 bg-zinc-900" aria-hidden />
        </div>
      )}

      {!loading && error && (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <ErrorState
            title="Curso indisponivel"
            description={error}
            action={
              error.toLowerCase().includes("sessao") || error.toLowerCase().includes("entre") || session.status !== "authenticated" ? (
                <Link className="inline-flex h-10 items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href={`/login?next=/cursos/${params.slug}`}>
                  Entrar para acessar detalhes
                </Link>
              ) : (
                <Button onClick={load} type="button" variant="outline">Tentar novamente</Button>
              )
            }
          />
        </section>
      )}

      {!loading && course && (
        <>
          <section className="relative overflow-hidden border-b border-zinc-800">
            <img alt={course.title} className="absolute inset-0 h-full w-full object-cover opacity-22" src={course.coverImageUrl ?? fallbackCover} />
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-950/70" />
            <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="brand">{courseStatusLabel(course.status)}</Badge>
                  <Badge>{course.career.name}</Badge>
                  {course.board && <Badge tone="info">{course.board.name}</Badge>}
                  <Badge tone={course.enrolled ? "success" : course.allowed ? "warning" : "danger"}>
                    {course.enrolled ? "Matriculado" : course.allowed ? "Acesso autorizado" : "Acesso bloqueado"}
                  </Badge>
                </div>
                <h1 className="mt-4 font-display text-4xl font-black uppercase leading-tight text-white md:text-5xl">{course.title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">{course.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {course.allowed ? (
                    <Button type="button" onClick={enroll} disabled={enrolling || course.enrolled}>
                      {enrolling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
                      {course.enrolled ? "Matriculado" : "Matricular"}
                    </Button>
                  ) : (
                    <Button type="button" disabled>
                      <Lock className="h-4 w-4" aria-hidden /> Acesso nao liberado
                    </Button>
                  )}
                  {canOpenLessons && nextLesson && (
                    <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href={`/aulas/${nextLesson.id}`}>
                      <PlayCircle className="h-4 w-4" aria-hidden /> Ir para primeira aula
                    </Link>
                  )}
                  {!course.allowed && (
                    <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href="/assinaturas">
                      Ver planos
                    </Link>
                  )}
                </div>
                {notice && (
                  <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950/80 p-3 text-sm text-zinc-300" role="status">
                    {notice}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <StatCard icon={<BookOpen className="h-4 w-4" />} label="Modulos" value={String(course.stats.moduleCount)} />
                <StatCard icon={<PlayCircle className="h-4 w-4" />} label="Aulas" value={String(course.stats.lessonCount)} tone="blue" />
                <StatCard icon={<Clock className="h-4 w-4" />} label="Carga" value={formatMinutes(course.stats.workloadSeconds || course.workloadMinutes * 60)} tone="zinc" />
              </div>
            </div>
          </section>

          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            {course.stats.lessonCount > 0 ? <CourseModules course={course} /> : <EmptyState title="Curso sem aulas publicadas" description="A estrutura aparecera aqui assim que os modulos forem publicados." />}

            <aside className="grid content-start gap-4">
              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Progresso</h2>
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                  <span>{progressLabel(course.stats.progressPercent)}</span>
                  <span>{course.stats.progressPercent}%</span>
                </div>
                <div className="mt-2 h-2 rounded bg-zinc-800" aria-hidden>
                  <div className="h-2 rounded bg-foxtrot-500" style={{ width: `${course.stats.progressPercent}%` }} />
                </div>
                <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                  <span>{course.stats.completedLessons}/{course.stats.lessonCount} aulas concluidas</span>
                  <span>{formatMinutes(course.stats.watchedSeconds)} assistidos</span>
                  <span>{course.enrolled ? "Matricula sincronizada" : "Matricula pendente"}</span>
                </div>
              </section>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Acesso</h2>
                <div className="mt-4 grid gap-3 text-sm text-zinc-300">
                  <span className="rounded bg-zinc-900 p-3">
                    {course.allowed ? <CheckCircle2 className="mr-2 inline h-4 w-4 text-green-300" aria-hidden /> : <ShieldAlert className="mr-2 inline h-4 w-4 text-red-300" aria-hidden />}
                    {course.allowed ? "Seu perfil tem permissao para este curso." : "Seu perfil ainda nao possui permissao para este curso."}
                  </span>
                  <span className="rounded bg-zinc-900 p-3">
                    {course.enrolled ? <CheckCircle2 className="mr-2 inline h-4 w-4 text-green-300" aria-hidden /> : <Lock className="mr-2 inline h-4 w-4 text-zinc-500" aria-hidden />}
                    {course.enrolled ? "Matricula registrada." : "Clique em matricular quando o acesso estiver liberado."}
                  </span>
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
