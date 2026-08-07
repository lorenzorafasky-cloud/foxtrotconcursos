"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Download,
  FileQuestion,
  Loader2,
  MessageSquareText,
  Play,
  ShieldAlert,
  Star
} from "lucide-react";
import { Badge, Button, EmptyState, ErrorState, Field, LoadingState, Textarea } from "@foxtrot/ui";
import { StudentNavigation } from "../../../components/StudentNavigation";
import {
  LessonDetail,
  createLessonDoubt,
  fetchLessonDetail,
  fetchLessonPlayback,
  fetchMaterialDownload,
  formatMinutes,
  rateLesson,
  updateLessonProgress
} from "../../../lib/courses";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const lessonId = params.id;
  const [lessonData, setLessonData] = useState<LessonDetail | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [doubt, setDoubt] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingPlayback, setLoadingPlayback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"info" | "success" | "error">("info");

  useEffect(() => {
    void load();
  }, [lessonId]);

  async function load() {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await fetchLessonDetail(lessonId);
      setLessonData(data);
      setWatchedSeconds(data.lesson?.progress?.watchedSeconds ?? 0);
      setCompleted(Boolean(data.lesson?.progress?.completedAt));
      setScore(data.lesson?.rating?.score ?? 0);
      setComment(data.lesson?.rating?.comment ?? "");
      if (data.allowed) await loadPlayback();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar a aula.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPlayback() {
    setLoadingPlayback(true);
    try {
      const response = await fetchLessonPlayback(lessonId);
      setPlaybackUrl(response.playback?.iframeUrl ?? "");
    } catch {
      setPlaybackUrl("");
    } finally {
      setLoadingPlayback(false);
    }
  }

  async function saveProgress(markCompleted = completed) {
    setSaving(true);
    setNotice("");
    try {
      await updateLessonProgress(lessonId, watchedSeconds, markCompleted);
      setCompleted(markCompleted);
      setNoticeTone("success");
      setNotice("Progresso salvo.");
    } catch (err) {
      setNoticeTone("error");
      setNotice(err instanceof Error ? err.message : "Nao foi possivel salvar progresso.");
    } finally {
      setSaving(false);
    }
  }

  async function rate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!score) {
      setNoticeTone("error");
      setNotice("Selecione uma nota de 1 a 5.");
      return;
    }
    setSaving(true);
    try {
      await rateLesson(lessonId, score, comment);
      setNoticeTone("success");
      setNotice("Avaliacao registrada.");
    } catch (err) {
      setNoticeTone("error");
      setNotice(err instanceof Error ? err.message : "Nao foi possivel avaliar a aula.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadMaterial(assetId: string) {
    setNoticeTone("info");
    setNotice("Preparando download...");
    try {
      const response = await fetchMaterialDownload(lessonId, assetId);
      if (!response.allowed || !response.url) {
        setNoticeTone("error");
        setNotice(response.reason ?? "Download nao permitido para este material.");
        return;
      }
      window.open(response.url, "_blank", "noopener,noreferrer");
      setNoticeTone("success");
      setNotice("Download autorizado.");
    } catch (err) {
      setNoticeTone("error");
      setNotice(err instanceof Error ? err.message : "Nao foi possivel baixar o material.");
    }
  }

  async function sendDoubt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!doubt.trim()) return;
    setSaving(true);
    try {
      await createLessonDoubt(lessonId, doubt.trim());
      setDoubt("");
      setNoticeTone("success");
      setNotice("Duvida enviada ao professor.");
      await load();
    } catch (err) {
      setNoticeTone("error");
      setNotice(err instanceof Error ? err.message : "Nao foi possivel enviar a duvida.");
    } finally {
      setSaving(false);
    }
  }

  const lesson = lessonData?.lesson;
  const downloadableAsset = useMemo(() => lesson?.assets.find((asset) => asset.canDownload) ?? null, [lesson]);
  const progressPercent = lesson ? Math.min(100, Math.round((watchedSeconds / Math.max(lesson.durationSeconds, 1)) * 100)) : 0;

  return (
    <main className="min-h-screen bg-zinc-950">
      <StudentNavigation activeHref="/cursos" />

      {loading && (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <LoadingState label="Carregando aula..." />
          <div className="h-96 animate-pulse rounded-md border border-zinc-800 bg-zinc-900" aria-hidden />
        </div>
      )}

      {!loading && error && (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <ErrorState title="Aula indisponivel" description={error} action={<Link className="inline-flex h-10 items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/cursos">Voltar ao catalogo</Link>} />
        </section>
      )}

      {!loading && lessonData && !lessonData.allowed && (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <EmptyState
            title="Aula bloqueada"
            description="Matricule-se em um curso autorizado antes de assistir esta aula."
            action={<Link className="inline-flex h-10 items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/cursos">Ver catalogo</Link>}
          />
        </section>
      )}

      {!loading && lesson && (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0">
            <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-foxtrot-300 hover:text-foxtrot-200" href={`/cursos/${lesson.module.course.slug}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> {lesson.module.course.title}
            </Link>

            <div className="aspect-video overflow-hidden rounded-md border border-zinc-800 bg-black">
              {loadingPlayback ? (
                <div className="flex h-full items-center justify-center text-zinc-300">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-foxtrot-400" aria-hidden /> Carregando player...
                </div>
              ) : playbackUrl ? (
                <iframe
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  className="h-full w-full"
                  src={playbackUrl}
                  title={lesson.title}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center">
                  <div>
                    <Play className="mx-auto mb-4 h-8 w-8 text-foxtrot-400" aria-hidden />
                    <p className="text-sm text-zinc-400">Playback indisponivel neste ambiente. Progresso e materiais continuam acessiveis.</p>
                  </div>
                </div>
              )}
            </div>

            <section className="mt-5 rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">{lesson.module.title}</Badge>
                <Badge>{lesson.subject.name}</Badge>
                {lesson.topic && <Badge tone="info">{lesson.topic.name}</Badge>}
                {completed && <Badge tone="success">Concluida</Badge>}
              </div>
              <h1 className="mt-4 font-display text-3xl font-black uppercase leading-tight text-white">{lesson.title}</h1>
              <p className="mt-2 leading-6 text-zinc-400">{lesson.description}</p>
              {lesson.teacher && <p className="mt-3 text-sm text-zinc-500">Professor: {lesson.teacher.fullName}</p>}

              <div className="mt-5">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{formatMinutes(watchedSeconds)} assistidos</span>
                  <span>{progressPercent}%</span>
                </div>
                <input
                  aria-label="Tempo assistido"
                  className="mt-3 w-full accent-orange-500"
                  max={Math.max(lesson.durationSeconds, 60)}
                  min={0}
                  onChange={(event) => setWatchedSeconds(Number(event.target.value))}
                  type="range"
                  value={watchedSeconds}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={saving} onClick={() => saveProgress(false)}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
                    Salvar progresso
                  </Button>
                  <Button type="button" disabled={saving || completed} onClick={() => saveProgress(true)}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Marcar como concluida
                  </Button>
                </div>
              </div>
            </section>

            {notice && (
              noticeTone === "error" ? (
                <div className="mt-4"><ErrorState title="Atencao" description={notice} /></div>
              ) : (
                <div
                  className={noticeTone === "success" ? "mt-4 rounded-md border border-green-900 bg-green-950/40 p-4 text-sm text-green-100" : "mt-4 rounded-md border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300"}
                  role="status"
                >
                  {notice}
                </div>
              )
            )}
          </section>

          <aside className="grid content-start gap-4">
            <form onSubmit={rate} className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="font-display text-xl font-bold uppercase text-white">Avaliar aula</h2>
              <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Nota da aula">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button aria-checked={score === value} aria-label={`Avaliar com ${value}`} key={value} onClick={() => setScore(value)} role="radio" type="button">
                    <Star className={value <= score ? "h-6 w-6 fill-orange-400 text-orange-400" : "h-6 w-6 text-zinc-600"} aria-hidden />
                  </button>
                ))}
              </div>
              <Field label="Comentario opcional" htmlFor="rating-comment">
                <Textarea id="rating-comment" onChange={(event) => setComment(event.target.value)} value={comment} />
              </Field>
              <Button className="mt-4 w-full" type="submit" disabled={saving || !score}>Salvar avaliacao</Button>
            </form>

            <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase text-white">
                <FileQuestion className="h-5 w-5 text-foxtrot-400" aria-hidden /> Materiais
              </h2>
              <div className="mt-4 grid gap-2">
                {lesson.assets.map((asset) => (
                  <button
                    className="rounded-md border border-zinc-800 p-3 text-left text-sm text-zinc-300 hover:border-foxtrot-500 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!asset.canDownload}
                    key={asset.id}
                    onClick={() => downloadMaterial(asset.id)}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span>
                        <strong className="block text-white">{asset.type}</strong>
                        <span className="mt-1 block text-xs text-zinc-500">{asset.storage.provider}</span>
                      </span>
                      <Download className="h-4 w-4 text-zinc-500" aria-hidden />
                    </span>
                    {!asset.canDownload && <span className="mt-2 block text-xs text-red-300">Download bloqueado</span>}
                  </button>
                ))}
                {lesson.assets.length === 0 && <EmptyState title="Sem materiais" description="Nenhum material complementar foi publicado para esta aula." />}
              </div>
              {downloadableAsset && (
                <Button className="mt-4 w-full" onClick={() => downloadMaterial(downloadableAsset.id)} type="button" variant="outline">
                  <Download className="h-4 w-4" aria-hidden /> Baixar primeiro material
                </Button>
              )}
            </section>

            <form onSubmit={sendDoubt} className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase text-white">
                <MessageSquareText className="h-5 w-5 text-foxtrot-400" aria-hidden /> Duvidas
              </h2>
              <Field label="Pergunta ao professor" htmlFor="lesson-doubt">
                <Textarea id="lesson-doubt" onChange={(event) => setDoubt(event.target.value)} placeholder="Digite sua duvida sobre a aula" value={doubt} />
              </Field>
              <Button className="mt-4 w-full" type="submit" disabled={saving || !doubt.trim()}>Enviar duvida</Button>
              <div className="mt-4 grid gap-3">
                {lesson.doubts.map((item) => (
                  <div className="rounded-md border border-zinc-800 p-3 text-sm text-zinc-300" key={item.id}>
                    <p>{item.message}</p>
                    {item.answer && <p className="mt-2 text-foxtrot-300">{item.answer}</p>}
                  </div>
                ))}
                {lesson.doubts.length === 0 && <p className="text-sm text-zinc-500">Nenhuma duvida enviada nesta aula.</p>}
              </div>
            </form>

            <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase text-white">
                <Bot className="h-5 w-5 text-foxtrot-400" aria-hidden /> Contexto
              </h2>
              <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                <span className="rounded bg-zinc-900 p-3">{lesson.subject.name}</span>
                {lesson.topic && <span className="rounded bg-zinc-900 p-3">{lesson.topic.name}</span>}
                <span className="rounded bg-zinc-900 p-3">{formatMinutes(lesson.durationSeconds)} de duracao</span>
              </div>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
