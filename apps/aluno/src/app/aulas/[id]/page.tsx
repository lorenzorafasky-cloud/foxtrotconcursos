"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Bot, CheckCircle2, Download, FileQuestion, Loader2, MessageSquareText, Play, ShieldAlert, Star } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";
import { apiRequest } from "../../../lib/api";
import { formatMinutes, LessonDetail } from "../../../lib/courses";

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const [lessonData, setLessonData] = useState<LessonDetail | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [doubt, setDoubt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void load();
  }, [params.id]);

  async function load() {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await apiRequest<LessonDetail>(`/lessons/${params.id}`);
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
    try {
      const response = await apiRequest<{ allowed: boolean; playback?: { iframeUrl: string } }>(`/lessons/${params.id}/playback`);
      setPlaybackUrl(response.playback?.iframeUrl ?? "");
    } catch {
      setPlaybackUrl("");
    }
  }

  async function saveProgress(markCompleted = completed) {
    setSaving(true);
    setNotice("");
    try {
      await apiRequest(`/lessons/${params.id}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ watchedSeconds, completed: markCompleted })
      });
      setCompleted(markCompleted);
      setNotice("Progresso salvo.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Nao foi possivel salvar progresso.");
    } finally {
      setSaving(false);
    }
  }

  async function rate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!score) {
      setNotice("Selecione uma nota de 1 a 5.");
      return;
    }
    setSaving(true);
    try {
      await apiRequest(`/lessons/${params.id}/ratings`, {
        method: "POST",
        body: JSON.stringify({ score, comment: comment || undefined })
      });
      setNotice("Avaliacao registrada.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Nao foi possivel avaliar a aula.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadMaterial(assetId: string) {
    setNotice("Preparando download...");
    try {
      const response = await apiRequest<{ allowed: boolean; url?: string; reason?: string }>(`/lessons/${params.id}/materials/${assetId}/download`);
      if (!response.allowed || !response.url) {
        setNotice(response.reason ?? "Download nao permitido para este material.");
        return;
      }
      window.open(response.url, "_blank", "noopener,noreferrer");
      setNotice("Download autorizado.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Nao foi possivel baixar o material.");
    }
  }

  async function sendDoubt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!doubt.trim()) return;
    setSaving(true);
    try {
      await apiRequest(`/lessons/${params.id}/doubts`, {
        method: "POST",
        body: JSON.stringify({ message: doubt.trim() })
      });
      setDoubt("");
      setNotice("Duvida enviada ao professor.");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Nao foi possivel enviar a duvida.");
    } finally {
      setSaving(false);
    }
  }

  const lesson = lessonData?.lesson;

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandMark />
          {lesson?.assets.find((asset) => asset.canDownload) ? (
            <Button type="button" onClick={() => {
              const asset = lesson.assets.find((item) => item.canDownload);
              if (asset) void downloadMaterial(asset.id);
            }}><Download className="h-4 w-4" /> Material</Button>
          ) : (
            <Link className="text-sm font-semibold text-foxtrot-400" href="/">Catalogo</Link>
          )}
        </div>
      </header>
      {loading && (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
          <div className="h-96 animate-pulse rounded-md border border-zinc-800 bg-zinc-900" />
          <div className="h-96 animate-pulse rounded-md border border-zinc-800 bg-zinc-900" />
        </div>
      )}
      {!loading && error && (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-md border border-red-900 bg-red-950/40 p-5 text-red-100">
            <ShieldAlert className="mb-3 h-5 w-5" />
            <p>{error}</p>
          </div>
        </section>
      )}
      {!loading && lessonData && !lessonData.allowed && (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h1 className="font-display text-3xl font-black uppercase text-white">Aula bloqueada</h1>
            <p className="mt-3 text-zinc-400">Matricule-se em um curso autorizado antes de assistir as aulas.</p>
            <Link className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/">Ver catalogo</Link>
          </div>
        </section>
      )}
      {!loading && lesson && (
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
          <section>
            <div className="aspect-video overflow-hidden rounded-md border border-zinc-800 bg-black">
              {playbackUrl ? (
                <iframe title={lesson.title} className="h-full w-full" src={playbackUrl} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center">
                  <div>
                    <Play className="mx-auto mb-4 h-8 w-8 text-foxtrot-400" />
                    <p className="text-sm text-zinc-400">Playback indisponivel neste ambiente. A aula, progresso e materiais continuam acessiveis.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <Link className="text-sm text-foxtrot-400" href={`/cursos/${lesson.module.course.slug}`}>{lesson.module.course.title}</Link>
              <h1 className="mt-3 font-display text-3xl font-black uppercase text-white">{lesson.title}</h1>
              <p className="mt-2 text-zinc-400">{lesson.description}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="text-sm text-zinc-300">
                  Tempo assistido: {formatMinutes(watchedSeconds)}
                  <input className="mt-3 w-full accent-orange-500" type="range" min={0} max={Math.max(lesson.durationSeconds, 60)} value={watchedSeconds} onChange={(event) => setWatchedSeconds(Number(event.target.value))} />
                </label>
                <div className="flex flex-wrap items-end gap-2">
                  <Button type="button" variant="ghost" disabled={saving} onClick={() => saveProgress(false)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Salvar</Button>
                  <Button type="button" disabled={saving || completed} onClick={() => saveProgress(true)}><CheckCircle2 className="h-4 w-4" /> Concluir</Button>
                </div>
              </div>
              {notice && <p className="mt-4 text-sm text-zinc-400">{notice}</p>}
            </div>
          </section>
          <aside className="grid content-start gap-4">
            <form onSubmit={rate} className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="font-display text-xl font-bold uppercase text-white">Avaliar aula</h2>
              <div className="mt-4 flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setScore(value)} aria-label={`Avaliar com ${value}`}>
                    <Star className={`h-6 w-6 ${value <= score ? "fill-orange-400 text-orange-400" : "text-zinc-600"}`} />
                  </button>
                ))}
              </div>
              <textarea className="mt-4 min-h-24 w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-white outline-none focus:border-orange-500" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Comentario opcional" />
              <Button className="mt-4 w-full" type="submit" disabled={saving}>Salvar avaliacao</Button>
            </form>
            <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
                <Bot className="h-5 w-5 text-foxtrot-400" /> Contexto
              </h2>
              <p className="mt-3 text-sm text-zinc-400">{lesson.subject.name}{lesson.topic ? ` / ${lesson.topic.name}` : ""}</p>
              {lesson.teacher && <p className="mt-2 text-sm text-zinc-500">Professor: {lesson.teacher.fullName}</p>}
            </section>
            <form onSubmit={sendDoubt} className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
                <MessageSquareText className="h-5 w-5 text-foxtrot-400" /> Duvidas
              </h2>
              <textarea className="mt-4 min-h-24 w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-white outline-none focus:border-orange-500" value={doubt} onChange={(event) => setDoubt(event.target.value)} placeholder="Enviar pergunta ao professor" />
              <Button className="mt-4 w-full" type="submit" disabled={saving || !doubt.trim()}>Enviar duvida</Button>
              <div className="mt-4 grid gap-3">
                {lesson.doubts.map((item) => (
                  <div key={item.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">
                    <p>{item.message}</p>
                    {item.answer && <p className="mt-2 text-foxtrot-300">{item.answer}</p>}
                  </div>
                ))}
              </div>
            </form>
            <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
                <FileQuestion className="h-5 w-5 text-foxtrot-400" /> Materiais
              </h2>
              <div className="mt-4 grid gap-2">
                {lesson.assets.map((asset) => (
                  <button
                    key={asset.id}
                    className="rounded border border-zinc-800 p-3 text-left text-sm text-zinc-300 hover:border-foxtrot-500 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={!asset.canDownload}
                    onClick={() => downloadMaterial(asset.id)}
                  >
                    <span className="block font-semibold text-white">{asset.type}</span>
                    <span className="mt-1 block text-xs text-zinc-500">{asset.storage.provider}</span>
                    {!asset.canDownload && <span className="mt-1 block text-xs text-red-300">Download bloqueado</span>}
                  </button>
                ))}
                {lesson.assets.length === 0 && <p className="text-sm text-zinc-400">Nenhum material publicado para esta aula.</p>}
              </div>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
