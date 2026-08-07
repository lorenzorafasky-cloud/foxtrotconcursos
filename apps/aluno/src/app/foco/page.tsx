"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Brain, Flame, Heart, Pause, Play, RotateCcw, Save, Star, Timer, Trophy, Volume2 } from "lucide-react";
import { BrandMark, Button, StatCard, cn } from "@foxtrot/ui";
import {
  Flashcard,
  FocusDashboard,
  FocusMode,
  createFlashcard,
  favoriteFlashcard,
  fetchFlashcards,
  fetchFocusDashboard,
  formatDuration,
  reviewFlashcard,
  saveFocusSession,
  updateFocusPreferences
} from "../../lib/productivity";

const soundLabels = [
  { key: "rain", label: "Chuva" },
  { key: "fire", label: "Fogueira" },
  { key: "storm", label: "Tempestade" },
  { key: "whiteNoise", label: "Ruido branco" },
  { key: "pinkNoise", label: "Ruido rosa" }
];

type SoundNode = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
};

export default function FocusPage() {
  const [dashboard, setDashboard] = useState<FocusDashboard | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [mode, setMode] = useState<FocusMode>("POMODORO");
  const [remaining, setRemaining] = useState(1500);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [soundSettings, setSoundSettings] = useState<Record<string, number>>({});
  const [cardForm, setCardForm] = useState({ front: "", back: "", favorite: false });
  const [revealedCardId, setRevealedCardId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundNodesRef = useRef<Partial<Record<string, SoundNode>>>({});

  useEffect(() => {
    void load();
    return () => {
      stopTimerInterval();
      stopSounds();
      void audioContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setElapsed((current) => current + 1);
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => stopTimerInterval();
  }, [running]);

  useEffect(() => {
    if (running && remaining === 0) void finishSession();
  }, [remaining, running]);

  useEffect(() => {
    if (running) syncSounds();
  }, [running, soundSettings]);

  const timerTarget = useMemo(() => {
    if (!dashboard) return mode === "POMODORO" ? 1500 : 0;
    return mode === "POMODORO" ? dashboard.preferences.pomodoroSeconds : Math.max(remaining + elapsed, 0);
  }, [dashboard, elapsed, mode, remaining]);

  async function load() {
    setLoading(true);
    setStatus("");
    try {
      const [nextDashboard, nextFlashcards] = await Promise.all([fetchFocusDashboard(), fetchFlashcards("all")]);
      setDashboard(nextDashboard);
      setFlashcards(nextFlashcards);
      setMode(nextDashboard.preferences.focusMode);
      setRemaining(nextDashboard.preferences.focusMode === "POMODORO" ? nextDashboard.preferences.pomodoroSeconds : 0);
      setSoundSettings(nextDashboard.preferences.soundSettings ?? {});
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar a Area Foco.");
    } finally {
      setLoading(false);
    }
  }

  function startTimer() {
    if (!startedAt) setStartedAt(new Date().toISOString());
    if (mode === "FREE" && remaining === 0) setRemaining(0);
    void startSounds();
    setRunning(true);
  }

  function pauseTimer() {
    setRunning(false);
    stopTimerInterval();
    stopSounds();
  }

  function resetTimer() {
    pauseTimer();
    setElapsed(0);
    setStartedAt(null);
    setRemaining(mode === "POMODORO" ? dashboard?.preferences.pomodoroSeconds ?? 1500 : 0);
  }

  async function finishSession() {
    pauseTimer();
    const plannedSeconds = dashboard?.preferences.pomodoroSeconds ?? 1500;
    const netSeconds = mode === "FREE" ? elapsed : Math.min(plannedSeconds, Math.max(1, elapsed || plannedSeconds));
    if (netSeconds < 1) return;
    setSaving(true);
    try {
      await saveFocusSession({
        mode,
        grossSeconds: Math.max(netSeconds, elapsed || netSeconds),
        netSeconds,
        taskId: selectedTaskId || undefined,
        startedAt: startedAt ?? new Date().toISOString()
      });
      setStatus("Sessao registrada.");
      resetTimer();
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel registrar a sessao.");
    } finally {
      setSaving(false);
    }
  }

  function stopTimerInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function startSounds() {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") await context.resume().catch(() => undefined);
    syncSounds();
  }

  function syncSounds() {
    const context = getAudioContext();
    if (!context) return;
    for (const sound of soundLabels) {
      const volume = Math.max(0, Math.min(100, soundSettings[sound.key] ?? 0));
      const current = soundNodesRef.current[sound.key];
      if (volume === 0) {
        stopSound(sound.key);
      } else if (current) {
        current.gain.gain.setTargetAtTime(volume / 500, context.currentTime, 0.03);
      } else {
        soundNodesRef.current[sound.key] = createSoundNode(context, sound.key, volume);
      }
    }
  }

  function stopSounds() {
    for (const sound of soundLabels) stopSound(sound.key);
  }

  function stopSound(key: string) {
    const current = soundNodesRef.current[key];
    if (!current) return;
    current.source.stop();
    current.source.disconnect();
    current.filter.disconnect();
    current.gain.disconnect();
    delete soundNodesRef.current[key];
  }

  function getAudioContext() {
    if (audioContextRef.current) return audioContextRef.current;
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioContextRef.current = new AudioContextCtor();
    return audioContextRef.current;
  }

  async function changeMode(nextMode: FocusMode) {
    setMode(nextMode);
    setElapsed(0);
    setStartedAt(null);
    setRunning(false);
    setRemaining(nextMode === "POMODORO" ? dashboard?.preferences.pomodoroSeconds ?? 1500 : 0);
    await updateFocusPreferences({ focusMode: nextMode }).catch(() => undefined);
  }

  async function saveSounds(nextSettings = soundSettings) {
    setSaving(true);
    try {
      await updateFocusPreferences({ soundSettings: nextSettings });
      setStatus("Sons salvos.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel salvar sons.");
    } finally {
      setSaving(false);
    }
  }

  async function submitCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await createFlashcard(cardForm);
      setCardForm({ front: "", back: "", favorite: false });
      setStatus("Flashcard criado.");
      setFlashcards(await fetchFlashcards("all"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel criar flashcard.");
    } finally {
      setSaving(false);
    }
  }

  async function reviewCard(id: string, quality: number) {
    setSaving(true);
    try {
      await reviewFlashcard(id, quality);
      setRevealedCardId("");
      setFlashcards(await fetchFlashcards("all"));
      setDashboard(await fetchFocusDashboard());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel revisar flashcard.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(card: Flashcard) {
    await favoriteFlashcard(card.id, !card.favorite);
    setFlashcards(await fetchFlashcards("all"));
  }

  const displaySeconds = mode === "FREE" ? elapsed : remaining;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <Link href="/"><BrandMark /></Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/gamificacao"><Trophy className="h-4 w-4" /> Ranking</Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/planejamento"><Timer className="h-4 w-4" /> Planejamento</Link>
          </div>
        </div>
      </header>

      <section className="border-b border-zinc-800">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-foxtrot-300">Produtividade</p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase text-white">Area Foco</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Flame className="h-4 w-4" />} label="Liquido hoje" value={formatDuration(dashboard?.netSecondsToday ?? 0)} />
            <StatCard icon={<Timer className="h-4 w-4" />} label="Semana" value={formatDuration(dashboard?.weeklyNetSeconds ?? 0)} tone="zinc" />
            <StatCard icon={<Star className="h-4 w-4" />} label="Sequencia" value={`${dashboard?.streakDays ?? 0} dias`} tone="red" />
            <StatCard icon={<Brain className="h-4 w-4" />} label="Patente" value={dashboard?.rank ?? "Recruta"} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {status && <p className="mb-4 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">{status}</p>}
        {loading ? (
          <Empty text="Carregando Area Foco." />
        ) : dashboard ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="grid gap-6">
              <article className="rounded-md border border-zinc-800 bg-zinc-950 p-6 text-center">
                <div className="flex justify-center gap-2">
                  {(["POMODORO", "FREE"] as const).map((item) => (
                    <button key={item} type="button" onClick={() => void changeMode(item)} className={cn("h-10 rounded-md px-4 text-sm font-semibold text-zinc-300 hover:bg-zinc-800", mode === item && "bg-zinc-800 text-white")}>
                      {item === "POMODORO" ? "Pomodoro" : "Livre"}
                    </button>
                  ))}
                </div>
                <strong className="mt-6 block font-display text-7xl font-black text-white">{formatDuration(displaySeconds)}</strong>
                <div className="mx-auto mt-4 max-w-sm">
                  <select className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm" value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
                    <option value="">Sem tarefa vinculada</option>
                    {dashboard.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                  </select>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button disabled={running} type="button" onClick={startTimer}><Play className="h-4 w-4" /> Iniciar</Button>
                  <Button disabled={!running} type="button" variant="ghost" onClick={pauseTimer}><Pause className="h-4 w-4" /> Pausar</Button>
                  <Button type="button" variant="ghost" onClick={resetTimer}><RotateCcw className="h-4 w-4" /> Zerar</Button>
                  <Button disabled={saving || elapsed < 1} type="button" variant="secondary" onClick={() => void finishSession()}><Save className="h-4 w-4" /> Registrar</Button>
                </div>
              </article>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Flashcards</h2>
                <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={submitCard}>
                  <TextInput label="Frente" value={cardForm.front} onChange={(front) => setCardForm((current) => ({ ...current, front }))} />
                  <TextInput label="Verso" value={cardForm.back} onChange={(back) => setCardForm((current) => ({ ...current, back }))} />
                  <Button className="self-end" disabled={saving || !cardForm.front.trim() || !cardForm.back.trim()} type="submit"><BookOpenCheck className="h-4 w-4" /> Criar</Button>
                </form>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {flashcards.map((card) => (
                    <article key={card.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase text-zinc-500">Vence {card.dueAt.slice(0, 10)} / {card.repetitions} revisoes</p>
                          <h3 className="mt-1 font-semibold text-white">{card.front}</h3>
                        </div>
                        <button type="button" onClick={() => void toggleFavorite(card)}><Heart className={cn("h-5 w-5", card.favorite ? "fill-red-500 text-red-500" : "text-zinc-500")} /></button>
                      </div>
                      {revealedCardId === card.id ? (
                        <div className="mt-3">
                          <p className="rounded bg-zinc-950 p-3 text-sm text-zinc-300">{card.back}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {[2, 3, 4, 5].map((quality) => <Button key={quality} type="button" variant="ghost" onClick={() => void reviewCard(card.id, quality)}>Nota {quality}</Button>)}
                          </div>
                        </div>
                      ) : (
                        <Button className="mt-3" type="button" variant="ghost" onClick={() => setRevealedCardId(card.id)}>Revelar</Button>
                      )}
                    </article>
                  ))}
                  {flashcards.length === 0 && <Empty text="Crie seu primeiro flashcard." />}
                </div>
              </section>
            </section>

            <aside className="grid content-start gap-4">
              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Sons de foco</h2>
                <div className="mt-4 grid gap-3">
                  {soundLabels.map((sound) => (
                    <div key={sound.key} className="grid grid-cols-[1fr_120px] items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-2"><Volume2 className="h-4 w-4 text-foxtrot-400" /> {sound.label}</span>
                      <input
                        aria-label={sound.label}
                        className="accent-orange-500"
                        max="100"
                        min="0"
                        type="range"
                        value={soundSettings[sound.key] ?? 0}
                        onChange={(event) => setSoundSettings((current) => ({ ...current, [sound.key]: Number(event.target.value) }))}
                      />
                    </div>
                  ))}
                  <Button disabled={saving} type="button" variant="ghost" onClick={() => void saveSounds()}><Save className="h-4 w-4" /> Salvar sons</Button>
                </div>
              </section>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Sessoes recentes</h2>
                <div className="mt-4 grid gap-2">
                  {dashboard.sessions.map((session) => (
                    <p key={session.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">{session.mode} / {formatDuration(session.netSeconds)} / {session.startedAt.slice(0, 10)}</p>
                  ))}
                  {dashboard.sessions.length === 0 && <p className="text-sm text-zinc-500">Nenhuma sessao registrada.</p>}
                </div>
              </section>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Consistencia</h2>
                <div className="mt-4 grid grid-cols-7 gap-2">
                  {dashboard.consistency.days.map((day) => <div key={day.date} title={day.date} className={cn("h-9 rounded-md border border-zinc-800", day.active ? "bg-foxtrot-500" : "bg-zinc-900")} />)}
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase text-zinc-500">
      {label}
      <input className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-orange-500" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">{text}</p>;
}

function createSoundNode(context: AudioContext, key: string, volume: number) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = makeNoiseBuffer(context, key);
  source.loop = true;
  configureFilter(filter, key);
  gain.gain.value = volume / 500;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start();
  return { source, filter, gain };
}

function makeNoiseBuffer(context: AudioContext, key: string) {
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let pink = 0;
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    pink = 0.96 * pink + 0.04 * white;
    const pulse = Math.sin((index / context.sampleRate) * Math.PI * 2 * 3);
    if (key === "pinkNoise" || key === "fire") data[index] = pink;
    else if (key === "storm") data[index] = white * (0.7 + Math.max(0, pulse) * 0.3);
    else data[index] = white;
  }
  return buffer;
}

function configureFilter(filter: BiquadFilterNode, key: string) {
  if (key === "rain") {
    filter.type = "bandpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.8;
  } else if (key === "fire") {
    filter.type = "lowpass";
    filter.frequency.value = 600;
  } else if (key === "storm") {
    filter.type = "lowpass";
    filter.frequency.value = 900;
  } else if (key === "pinkNoise") {
    filter.type = "lowpass";
    filter.frequency.value = 1200;
  } else {
    filter.type = "highpass";
    filter.frequency.value = 120;
  }
}
