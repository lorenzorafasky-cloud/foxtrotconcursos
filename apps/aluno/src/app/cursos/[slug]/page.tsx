"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Loader2, Lock, PlayCircle, ShieldAlert } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";
import { apiRequest } from "../../../lib/api";
import { CourseDetail, courseStatusLabel, formatMinutes } from "../../../lib/courses";

export default function CourseDetailPage({ params }: { params: { slug: string } }) {
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
      setCourse(await apiRequest<CourseDetail>(`/courses/${params.slug}`));
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
      await apiRequest(`/courses/${course.slug}/enroll`, { method: "POST", body: "{}" });
      setNotice("Matricula ativa. As aulas ja estao liberadas.");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Nao foi possivel concluir a matricula.");
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandMark />
          <Link className="text-sm font-semibold text-foxtrot-400" href="/">Catalogo</Link>
        </div>
      </header>
      {loading && (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
          <div className="h-96 animate-pulse rounded-md border border-zinc-800 bg-zinc-900" />
          <div className="h-64 animate-pulse rounded-md border border-zinc-800 bg-zinc-900" />
        </div>
      )}
      {!loading && error && (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-md border border-red-900 bg-red-950/40 p-5 text-red-100">
            <ShieldAlert className="mb-3 h-5 w-5" />
            <p>{error}</p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-foxtrot-400" href="/login">Entrar para acessar detalhes</Link>
          </div>
        </section>
      )}
      {!loading && course && (
        <>
          <section className="relative overflow-hidden border-b border-zinc-800">
            <img alt={course.title} className="absolute inset-0 h-full w-full object-cover opacity-20" src={course.coverImageUrl ?? "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop"} />
            <div className="relative mx-auto max-w-7xl px-4 py-10">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2 text-xs uppercase text-zinc-400">
                  <span>{courseStatusLabel(course.status)}</span>
                  <span>{course.career.name}</span>
                  {course.board && <span>{course.board.name}</span>}
                </div>
                <h1 className="mt-4 font-display text-4xl font-black uppercase leading-tight text-white md:text-5xl">{course.title}</h1>
                <p className="mt-4 text-zinc-300">{course.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {course.allowed ? (
                    <Button type="button" onClick={enroll} disabled={enrolling || course.enrolled}>
                      {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {course.enrolled ? "Matriculado" : "Matricular"}
                    </Button>
                  ) : (
                    <Button type="button" disabled><Lock className="h-4 w-4" /> Acesso nao liberado</Button>
                  )}
                  <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-transparent px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/conta">Minha conta</Link>
                </div>
                {notice && <p className="mt-4 text-sm text-zinc-300">{notice}</p>}
              </div>
            </div>
          </section>
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
            <section className="grid gap-4">
              {course.modules.map((module) => (
                <article key={module.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                  <h2 className="font-display text-2xl font-bold uppercase text-white">{module.position}. {module.title}</h2>
                  <div className="mt-4 grid gap-3">
                    {module.lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        href={course.allowed && course.enrolled ? `/aulas/${lesson.id}` : "#"}
                        className="grid gap-3 rounded border border-zinc-800 p-3 text-sm hover:border-foxtrot-500 md:grid-cols-[1fr_auto]"
                        onClick={(event) => {
                          if (!course.allowed || !course.enrolled) event.preventDefault();
                        }}
                      >
                        <span className="flex items-center gap-3">
                          {course.allowed && course.enrolled ? <PlayCircle className="h-5 w-5 text-foxtrot-400" /> : <Lock className="h-5 w-5 text-zinc-600" />}
                          <span>
                            <strong className="block text-white">{lesson.title}</strong>
                            <span className="text-zinc-500">{lesson.description}</span>
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2 text-zinc-400"><Clock className="h-4 w-4" /> {formatMinutes(lesson.durationSeconds)}</span>
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </section>
            <aside className="grid content-start gap-4">
              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Progresso</h2>
                <div className="mt-4 h-2 rounded bg-zinc-800">
                  <div className="h-2 rounded bg-foxtrot-500" style={{ width: `${course.stats.progressPercent}%` }} />
                </div>
                <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                  <span>{course.stats.progressPercent}% concluido</span>
                  <span>{course.stats.completedLessons}/{course.stats.lessonCount} aulas concluidas</span>
                  <span>{formatMinutes(course.stats.watchedSeconds)} assistidos</span>
                </div>
              </section>
              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Estrutura</h2>
                <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                  <span className="rounded bg-zinc-900 p-3"><BookOpen className="mr-2 inline h-4 w-4 text-foxtrot-400" /> {course.stats.moduleCount} modulos</span>
                  <span className="rounded bg-zinc-900 p-3"><PlayCircle className="mr-2 inline h-4 w-4 text-foxtrot-400" /> {course.stats.lessonCount} aulas</span>
                  <span className="rounded bg-zinc-900 p-3"><Clock className="mr-2 inline h-4 w-4 text-foxtrot-400" /> {formatMinutes(course.workloadMinutes * 60)} de carga</span>
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
