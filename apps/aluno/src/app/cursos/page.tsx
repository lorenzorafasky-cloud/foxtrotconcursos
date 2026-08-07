"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Target } from "lucide-react";
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, StatCard, useAuthSession } from "@foxtrot/ui";
import { CourseCard, CourseCardSkeleton } from "../../components/CourseCard";
import { CourseFilters } from "../../components/CourseFilters";
import { StudentNavigation } from "../../components/StudentNavigation";
import {
  CourseEnrollment,
  CourseStatus,
  CourseSummary,
  fetchCourseCatalog,
  fetchMyCourses,
  formatMinutes,
  summarizeStudentCourses
} from "../../lib/courses";

export default function CoursesCatalogPage() {
  const session = useAuthSession();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [myCourses, setMyCourses] = useState<CourseEnrollment[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CourseStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [loadingMyCourses, setLoadingMyCourses] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadMyCourses();
    if (session.status === "anonymous" || session.status === "forbidden") setMyCourses([]);
  }, [session.status]);

  async function loadCatalog(nextFilters = { q, status }) {
    setLoading(true);
    setError("");
    try {
      setCourses(await fetchCourseCatalog(nextFilters));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel buscar cursos.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMyCourses() {
    setLoadingMyCourses(true);
    try {
      setMyCourses(await fetchMyCourses());
    } catch {
      setMyCourses([]);
    } finally {
      setLoadingMyCourses(false);
    }
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadCatalog({ q, status });
  }

  async function clearFilters() {
    setQ("");
    setStatus("");
    await loadCatalog({ q: "", status: "" });
  }

  const enrollmentByCourseId = useMemo(() => new Set(myCourses.map((enrollment) => enrollment.courseId)), [myCourses]);
  const totals = useMemo(() => summarizeStudentCourses(myCourses), [myCourses]);
  const lessonCount = useMemo(() => courses.reduce((sum, course) => sum + course.stats.lessonCount, 0), [courses]);

  return (
    <main className="min-h-screen bg-zinc-950">
      <StudentNavigation activeHref="/cursos" />
      <PageHeader
        eyebrow="Catalogo"
        title="Cursos publicados"
        description="Pesquise cursos liberados, veja estrutura e entre nos detalhes para matricula quando sua permissao permitir."
        actions={
          session.status === "authenticated" ? (
            <Link className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href="/">
              Meu painel
            </Link>
          ) : (
            <Link className="inline-flex h-10 items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/login?next=/cursos">
              Entrar
            </Link>
          )
        }
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard icon={<BookOpen className="h-4 w-4" />} label="Cursos encontrados" value={loading ? "..." : String(courses.length)} />
            <StatCard icon={<Target className="h-4 w-4" />} label="Aulas publicadas" value={loading ? "..." : String(lessonCount)} tone="blue" />
            <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Matriculas" value={loadingMyCourses ? "..." : String(myCourses.length)} tone="green" />
          </div>

          <div className="mt-6">
            <CourseFilters
              loading={loading}
              onClear={clearFilters}
              onQueryChange={setQ}
              onStatusChange={setStatus}
              onSubmit={search}
              q={q}
              status={status}
            />
          </div>

          {error && <div className="mt-6"><ErrorState title="Catalogo indisponivel" description={error} action={<Button onClick={() => loadCatalog()} type="button" variant="outline">Tentar novamente</Button>} /></div>}
          {!error && loading && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => <CourseCardSkeleton key={item} />)}
            </div>
          )}
          {!error && !loading && courses.length === 0 && (
            <div className="mt-6">
              <EmptyState title="Nenhum curso encontrado" description="Ajuste os filtros ou limpe a busca para ver todos os cursos publicados." action={<Button onClick={clearFilters} type="button" variant="outline">Limpar filtros</Button>} />
            </div>
          )}
          {!error && !loading && courses.length > 0 && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {courses.map((course) => (
                <CourseCard course={course} enrolled={enrollmentByCourseId.has(course.id)} key={course.id} />
              ))}
            </div>
          )}
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase text-white">Resumo do aluno</h2>
            {session.status === "loading" && <div className="mt-4"><LoadingState label="Validando sessao..." /></div>}
            {session.status !== "authenticated" && session.status !== "loading" && (
              <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">
                Entre para ver progresso, matriculas e aulas liberadas.
              </div>
            )}
            {session.status === "authenticated" && (
              <div className="mt-4 grid gap-3 text-sm text-zinc-300">
                <span className="rounded bg-zinc-900 p-3">{totals.enrolledCourses} cursos matriculados</span>
                <span className="rounded bg-zinc-900 p-3">{totals.completedLessons}/{totals.totalLessons} aulas concluidas</span>
                <span className="rounded bg-zinc-900 p-3">{formatMinutes(totals.watchedSeconds)} assistidos</span>
                <span className="rounded bg-zinc-900 p-3">{totals.progressPercent}% de progresso geral</span>
              </div>
            )}
          </section>
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase text-white">Como seguir</h2>
            <div className="mt-4 grid gap-3 text-sm text-zinc-300">
              <span className="rounded bg-zinc-900 p-3"><BookOpen className="mr-2 inline h-4 w-4 text-foxtrot-400" aria-hidden /> Abra detalhes do curso</span>
              <span className="rounded bg-zinc-900 p-3"><CheckCircle2 className="mr-2 inline h-4 w-4 text-foxtrot-400" aria-hidden /> Matricule-se quando autorizado</span>
              <span className="rounded bg-zinc-900 p-3"><Clock className="mr-2 inline h-4 w-4 text-foxtrot-400" aria-hidden /> Acompanhe progresso nas aulas</span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
