"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Bot, CheckCircle2, Clock, CreditCard, Flame, Loader2, Search, ShieldAlert, Target, Trophy, UserCircle } from "lucide-react";
import { BrandMark, Button, StatCard } from "@foxtrot/ui";
import { apiRequest, AuthProfile } from "../lib/api";
import { CourseEnrollment, CourseStatus, CourseSummary, courseStatusLabel, formatMinutes } from "../lib/courses";

export default function StudentHome() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [myCourses, setMyCourses] = useState<CourseEnrollment[]>([]);
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CourseStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const catalog = await apiRequest<CourseSummary[]>("/courses");
      setCourses(catalog);
      await loadStudentArea();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar os cursos.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentArea() {
    try {
      const profile = await apiRequest<AuthProfile>("/auth/me");
      setUser(profile);
      setMyCourses(await apiRequest<CourseEnrollment[]>("/me/courses"));
    } catch {
      setUser(null);
      setMyCourses([]);
    }
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      setCourses(await apiRequest<CourseSummary[]>(`/courses${params.size ? `?${params}` : ""}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel buscar cursos.");
    } finally {
      setLoading(false);
    }
  }

  const currentCourse = useMemo(() => (
    [...myCourses].sort((a, b) => b.course.stats.progressPercent - a.course.stats.progressPercent)[0]
  ), [myCourses]);

  const totals = useMemo(() => {
    const completed = myCourses.reduce((sum, enrollment) => sum + enrollment.course.stats.completedLessons, 0);
    const lessons = myCourses.reduce((sum, enrollment) => sum + enrollment.course.stats.lessonCount, 0);
    const watched = myCourses.reduce((sum, enrollment) => sum + enrollment.course.stats.watchedSeconds, 0);
    return { completed, lessons, watched };
  }, [myCourses]);

  return (
    <main className="min-h-screen bg-zinc-950">
      <nav className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <BrandMark />
          <div className="hidden items-center gap-2 md:flex">
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="#catalogo"><Search className="h-4 w-4" /> Cursos</Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/questoes"><Target className="h-4 w-4" /> Questoes</Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/foco"><Clock className="h-4 w-4" /> Foco</Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/gamificacao"><Trophy className="h-4 w-4" /> Ranking</Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/ia"><Bot className="h-4 w-4" /> IA</Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/assinaturas"><CreditCard className="h-4 w-4" /> Planos</Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href={user ? "/conta" : "/login"}><UserCircle className="h-4 w-4" /> {user ? user.nickname : "Entrar"}</Link>
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
              Continue sua preparacao com catalogo vivo, progresso sincronizado e aulas conectadas a sua conta.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href={currentCourse ? `/cursos/${currentCourse.course.slug}` : "#catalogo"}><BookOpen className="h-4 w-4" /> {currentCourse ? "Retomar curso" : "Ver catalogo"}</Link>
              <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700" href="/foco"><Flame className="h-4 w-4" /> Iniciar foco</Link>
            </div>
          </div>
          <div className="grid gap-3">
            <StatCard icon={<Trophy className="h-4 w-4" />} label="Cursos matriculados" value={String(myCourses.length)} />
            <StatCard icon={<Flame className="h-4 w-4" />} label="Tempo assistido" value={formatMinutes(totals.watched)} tone="red" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <section id="catalogo">
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard icon={<Target className="h-4 w-4" />} label="Catalogo" value={`${courses.length} cursos`} />
            <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Aulas concluidas" value={`${totals.completed}/${totals.lessons}`} />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Matriculas" value={user ? String(myCourses.length) : "Login"} />
          </div>
          <form onSubmit={search} className="mt-6 grid gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-[1fr_180px_auto]">
            <input className="h-11 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-orange-500" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar por curso, carreira ou descricao" />
            <select className="h-11 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-orange-500" value={status} onChange={(event) => setStatus(event.target.value as CourseStatus | "")}>
              <option value="">Todos</option>
              <option value="PRE_EDITAL">Pre-edital</option>
              <option value="POS_EDITAL">Pos-edital</option>
            </select>
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar</Button>
          </form>
          {error && (
            <div className="mt-4 flex items-center gap-3 rounded-md border border-red-900 bg-red-950/40 p-4 text-sm text-red-100">
              <ShieldAlert className="h-4 w-4" /> {error}
            </div>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {loading && [0, 1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-md border border-zinc-800 bg-zinc-900" />)}
            {!loading && courses.map((course) => (
              <article key={course.id} className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
                <img alt={course.title} className="h-40 w-full object-cover opacity-80" src={course.coverImageUrl ?? "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop"} />
                <div className="p-5">
                  <div className="flex flex-wrap gap-2 text-xs uppercase text-zinc-400">
                    <span>{courseStatusLabel(course.status)}</span>
                    <span>{course.career.name}</span>
                    {course.board && <span>{course.board.name}</span>}
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-bold uppercase text-white">{course.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{course.description}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-zinc-300">
                    <span className="rounded bg-zinc-900 p-2">{course.stats.moduleCount} mod.</span>
                    <span className="rounded bg-zinc-900 p-2">{course.stats.lessonCount} aulas</span>
                    <span className="rounded bg-zinc-900 p-2">{formatMinutes(course.workloadMinutes * 60)}</span>
                  </div>
                  <Link className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href={`/cursos/${course.slug}`}>
                    <BookOpen className="h-4 w-4" /> Abrir curso
                  </Link>
                </div>
              </article>
            ))}
            {!loading && courses.length === 0 && (
              <div className="rounded-md border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400 md:col-span-2">
                Nenhum curso encontrado para os filtros atuais.
              </div>
            )}
          </div>
        </section>

        <aside className="grid gap-4">
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase">Meus cursos</h2>
            <div className="mt-4 grid gap-3">
              {myCourses.map((enrollment) => (
                <Link key={enrollment.id} href={`/cursos/${enrollment.course.slug}`} className="rounded border border-zinc-800 p-3 text-sm hover:border-foxtrot-500">
                  <span className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-foxtrot-400" />
                    <span>{enrollment.course.title}</span>
                  </span>
                  <span className="mt-3 block h-2 rounded bg-zinc-800">
                    <span className="block h-2 rounded bg-foxtrot-500" style={{ width: `${enrollment.course.stats.progressPercent}%` }} />
                  </span>
                  <span className="mt-2 block text-xs text-zinc-500">{enrollment.course.stats.progressPercent}% concluido</span>
                </Link>
              ))}
              {!user && (
                <Link href="/login" className="flex items-center gap-3 rounded border border-zinc-800 p-3 text-sm text-zinc-300 hover:border-foxtrot-500">
                  <CheckCircle2 className="h-4 w-4 text-foxtrot-400" />
                  <span>Entre para ver suas matriculas</span>
                </Link>
              )}
              {user && myCourses.length === 0 && <p className="text-sm text-zinc-400">Voce ainda nao iniciou nenhum curso.</p>}
            </div>
          </section>
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase">Progresso geral</h2>
            <div className="mt-4 grid gap-3 text-sm text-zinc-300">
              <span className="rounded bg-zinc-900 p-3">{totals.completed} aulas concluidas</span>
              <span className="rounded bg-zinc-900 p-3">{formatMinutes(totals.watched)} assistidos</span>
              <span className="rounded bg-zinc-900 p-3">{totals.lessons} aulas matriculadas</span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
