"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Lock, PlayCircle } from "lucide-react";
import { Badge, EmptyState } from "@foxtrot/ui";
import { CourseDetail, formatMinutes } from "../lib/courses";

export function CourseModules({ course }: { course: CourseDetail }) {
  if (course.modules.length === 0) {
    return <EmptyState title="Nenhum modulo publicado" description="O curso ainda nao possui aulas liberadas." />;
  }

  return (
    <section className="grid gap-4" aria-label="Modulos e aulas">
      {course.modules.map((module) => (
        <article className="rounded-md border border-zinc-800 bg-zinc-950 p-5" key={module.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-zinc-500">Modulo {module.position}</p>
              <h2 className="mt-1 font-display text-2xl font-bold uppercase text-white">{module.title}</h2>
            </div>
            <Badge>{module.lessons.length} aulas</Badge>
          </div>
          <div className="mt-4 grid gap-3">
            {module.lessons.map((lesson) => {
              const unlocked = course.allowed && course.enrolled;
              return (
                <Link
                  aria-disabled={!unlocked}
                  className="grid gap-3 rounded-md border border-zinc-800 p-3 text-sm hover:border-foxtrot-500 md:grid-cols-[minmax(0,1fr)_auto]"
                  href={unlocked ? `/aulas/${lesson.id}` : "#"}
                  key={lesson.id}
                  onClick={(event) => {
                    if (!unlocked) event.preventDefault();
                  }}
                >
                  <span className="flex min-w-0 items-start gap-3">
                    {unlocked ? <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-foxtrot-400" aria-hidden /> : <Lock className="mt-0.5 h-5 w-5 shrink-0 text-zinc-600" aria-hidden />}
                    <span className="min-w-0">
                      <strong className="block text-white">{lesson.title}</strong>
                      <span className="mt-1 line-clamp-2 text-zinc-500">{lesson.description}</span>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2 text-zinc-400">
                    <Clock className="h-4 w-4" aria-hidden /> {formatMinutes(lesson.durationSeconds)}
                  </span>
                </Link>
              );
            })}
            {module.lessons.length === 0 && (
              <div className="rounded-md border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
                Aulas deste modulo ainda nao foram publicadas.
              </div>
            )}
          </div>
        </article>
      ))}
      {course.enrolled && (
        <div className="rounded-md border border-green-900 bg-green-950/30 p-4 text-sm text-green-100">
          <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden />
          Matricula ativa. As aulas liberadas podem ser acessadas diretamente pela lista.
        </div>
      )}
    </section>
  );
}
