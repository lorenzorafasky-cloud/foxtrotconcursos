"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Lock, PlayCircle } from "lucide-react";
import { Badge, Button, Card, cn } from "@foxtrot/ui";
import { CourseSummary, courseStatusLabel, findNextLesson, formatMinutes, progressLabel } from "../lib/courses";

const fallbackCover = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop";

export function CourseCard({
  course,
  enrolled = false,
  compact = false
}: {
  course: CourseSummary;
  enrolled?: boolean;
  compact?: boolean;
}) {
  const nextLesson = findNextLesson(course);

  return (
    <Card className="overflow-hidden p-0">
      <img alt={course.title} className={cn("w-full object-cover opacity-85", compact ? "h-32" : "h-40")} src={course.coverImageUrl ?? fallbackCover} />
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{courseStatusLabel(course.status)}</Badge>
          <Badge>{course.career.name}</Badge>
          {course.board && <Badge tone="info">{course.board.name}</Badge>}
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold uppercase leading-tight text-white">{course.title}</h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{course.description}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-zinc-300">
          <span className="rounded bg-zinc-900 p-2">{course.stats.moduleCount} mod.</span>
          <span className="rounded bg-zinc-900 p-2">{course.stats.lessonCount} aulas</span>
          <span className="rounded bg-zinc-900 p-2">{formatMinutes(course.stats.workloadSeconds || course.workloadMinutes * 60)}</span>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{progressLabel(course.stats.progressPercent)}</span>
            <span>{course.stats.progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 rounded bg-zinc-800" aria-hidden>
            <div className="h-2 rounded bg-foxtrot-500" style={{ width: `${course.stats.progressPercent}%` }} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href={`/cursos/${course.slug}`}>
            <BookOpen className="h-4 w-4" aria-hidden /> Ver curso
          </Link>
          {enrolled && nextLesson && (
            <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href={`/aulas/${nextLesson.id}`}>
              <PlayCircle className="h-4 w-4" aria-hidden /> Aula
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export function EnrolledCourseRow({ course }: { course: CourseSummary }) {
  const nextLesson = findNextLesson(course);
  return (
    <Link href={`/cursos/${course.slug}`} className="block rounded-md border border-zinc-800 p-3 text-sm hover:border-foxtrot-500">
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-foxtrot-400" aria-hidden />
          <span className="min-w-0">
            <strong className="block truncate text-white">{course.title}</strong>
            <span className="text-xs text-zinc-500">{nextLesson ? `Proxima: ${nextLesson.title}` : "Curso sem aulas publicadas"}</span>
          </span>
        </span>
        {nextLesson ? <PlayCircle className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden /> : <Lock className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />}
      </span>
      <span className="mt-3 block h-2 rounded bg-zinc-800">
        <span className="block h-2 rounded bg-foxtrot-500" style={{ width: `${course.stats.progressPercent}%` }} />
      </span>
      <span className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {course.stats.progressPercent}% concluido
      </span>
    </Link>
  );
}

export function CourseCardSkeleton() {
  return <div className="h-96 animate-pulse rounded-md border border-zinc-800 bg-zinc-900" aria-hidden />;
}

export { fallbackCover };
