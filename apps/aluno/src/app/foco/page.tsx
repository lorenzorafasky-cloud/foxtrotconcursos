"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  Brain,
  CalendarDays,
  Flame,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Save,
  Star,
  Timer,
  Trophy,
  Volume2
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
  StatCard,
  Tabs,
  Textarea,
  cn
} from "@foxtrot/ui";
import { StudentNavigation } from "../../components/StudentNavigation";
import {
  Flashcard,
  FocusDashboard,
  FocusMode,
  clampTimerSeconds,
  consistencyPercent,
  createFlashcard,
  favoriteFlashcard,
  fetchFlashcards,
  fetchFocusDashboard,
  flashcardDueCount,
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

type FlashcardFilter = "due" | "favorites" | "all";
type Status = { type: "success" | "error"; message: string } | null;
type SoundNode = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
};

export default function FocusPage() {
  const [dashboard, setDashboard] = useState<FocusDashboard | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardFilter, setFlashcardFilter] = useState<FlashcardFilter>("due");
  const [mode, setMode] = useState<FocusMode>("POMODORO");
  const [remaining, setRemaining] = useState(1500);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [soundSettings, setSoundSettings] = useState<Record<string, number>>({});
  const [cardForm, setCardForm] = useState({ front: "", back: "", favorite: false });
  const [revealedCardId, setRevealedCardId] = useState("");
  const [status, setStatus] = useState<Status>(null);
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
    void refreshFlashcards();
  }, [flashcardFilter]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setElapsed((current) => current + 1);
      setRemaining((current) => (mode === "POMODORO" ? clampTimerSeconds(current - 1) : 0));
    }, 1000);
    return () => stopTimerInterval();
  }, [mode, running]);

  useEffect(() => {
    if (running && mode === "POMODORO" && remaining === 0) void finishSession();
  }, [mode, remaining, running]);

  useEffect(() => {
    if (running) syncSounds();
  }, [running, soundSettings]);

  const displaySeconds = mode === "FREE" ? elapsed : remaining;
  const plannedSeconds = mode === "POMODORO" ? Math.max(dashboard?.preferences.pomodoroSeconds ?? 1500, 1) : Math.max(elapsed, 1);
  const progressPercent = mode === "POMODORO" ? Math.min(100, Math.round(((plannedSeconds - remaining) / plannedSeconds) * 100)) : 0;
  const dueCount = useMemo(() => flashcardDueCount(flashcards), [flashcards]);

  async function load() {
    setLoading(true);
    setStatus(null);
    try {
      const [nextDashboard, nextFlashcards] = await Promise.all([fetchFocusDashboard(), fetchFlashcards(flashcardFilter)]);
      setDashboard(nextDashboard);
      setFlashcards(nextFlashcards);
      setMode(nextDashboard.preferences.focusMode);
      setRemaining(nextDashboard.preferences.focusMode === "POMODORO" ? nextDashboard.preferences.pomodoroSeconds : 0);
      setSoundSettings(nextDashboard.preferences.soundSettings ?? {});
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel carregar a Area Foco." });
    } finally {
      setLoading(false);
    }
  }

  async function refreshFlashcards() {
    try {
      setFlashcards(await fetchFlashcards(flashcardFilter));
    } catch {
      setFlashcards([]);
    }
  }

  function startTimer() {
    if (!startedAt) setStartedAt(new Date().toISOString());
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
    const netSeconds = mode === "FREE" ? elapsed : Math.min(plannedSeconds, Math.max(1, elapsed || plannedSeconds));
    if (netSeconds < 1) return;
    setSaving(true);
    setStatus(null);
    try {
      await saveFocusSession({
        mode,
        grossSeconds: Math.max(netSeconds, elapsed || netSeconds),
        netSeconds,
        taskId: selectedTaskId || undefined,
        startedAt: startedAt ?? new Date().toISOString()
      });
      setStatus({ type: "success", message: "Sessao registrada." });
      resetTimer();
      await load();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel registrar a sessao." });
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
    pauseTimer();
    setMode(nextMode);
    setElapsed(0);
    setStartedAt(null);
    setRemaining(nextMode === "POMODORO" ? dashboard?.preferences.pomodoroSeconds ?? 1500 : 0);
    await updateFocusPreferences({ focusMode: nextMode }).catch(() => undefined);
  }

  async function saveSounds(nextSettings = soundSettings) {
    setSaving(true);
    setStatus(null);
    try {
      await updateFocusPreferences({ soundSettings: nextSettings });
      setStatus({ type: "success", message: "Sons salvos." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel salvar sons." });
    } finally {
      setSaving(false);
    }
  }

  async function submitCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await createFlashcard({ front: cardForm.front.trim(), back: cardForm.back.trim(), favorite: cardForm.favorite });
      setCardForm({ front: "", back: "", favorite: false });
      setStatus({ type: "success", message: "Flashcard criado." });
      await refreshFlashcards();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel criar flashcard." });
    } finally {
      setSaving(false);
    }
  }

  async function reviewCard(id: string, quality: number) {
    setSaving(true);
    setStatus(null);
    try {
      await reviewFlashcard(id, quality);
      setRevealedCardId("");
      await refreshFlashcards();
      setDashboard(await fetchFocusDashboard());
      setStatus({ type: "success", message: "Revisao registrada." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel revisar flashcard." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(card: Flashcard) {
    setSaving(true);
    setStatus(null);
    try {
      await favoriteFlashcard(card.id, !card.favorite);
      await refreshFlashcards();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel atualizar favorito." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <StudentNavigation activeHref="/foco" />
      <PageHeader
        eyebrow="Produtividade do aluno"
        title="Area Foco"
        description="Use o temporizador, registre sessoes reais, revise flashcards e acompanhe sua consistencia."
        actions={
          <>
            <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href="/planejamento">
              <CalendarDays className="h-4 w-4" aria-hidden /> Planejamento
            </Link>
            <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href="/gamificacao">
              <Trophy className="h-4 w-4" aria-hidden /> Ranking
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {status?.type === "error" && <ErrorState description={status.message} action={<Button type="button" variant="outline" onClick={() => void load()}>Tentar novamente</Button>} />}
        {status?.type === "success" && <p className="mb-4 rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-100">{status.message}</p>}

        {loading ? (
          <LoadingState label="Carregando Area Foco..." />
        ) : dashboard ? (
          <div className="grid gap-6">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={<Flame className="h-4 w-4" aria-hidden />} label="Liquido hoje" value={formatDuration(dashboard.netSecondsToday)} />
              <StatCard icon={<Timer className="h-4 w-4" aria-hidden />} label="Semana" value={formatDuration(dashboard.weeklyNetSeconds)} tone="blue" />
              <StatCard icon={<Star className="h-4 w-4" aria-hidden />} label="Sequencia" value={`${dashboard.streakDays} dias`} tone="red" />
              <StatCard icon={<Brain className="h-4 w-4" aria-hidden />} label="Patente" value={dashboard.rank} tone="zinc" />
              <StatCard icon={<BookOpenCheck className="h-4 w-4" aria-hidden />} label="Cards vencidos" value={String(dueCount)} tone="green" />
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="grid gap-6">
                <Card className="text-center">
                  <Tabs
                    items={[
                      { id: "POMODORO", label: "Pomodoro" },
                      { id: "FREE", label: "Livre" }
                    ]}
                    value={mode}
                    onChange={(value) => void changeMode(value)}
                  />
                  <strong className="mt-6 block font-display text-6xl font-black text-white sm:text-7xl" aria-live="polite">
                    {formatDuration(displaySeconds)}
                  </strong>
                  <div className="mx-auto mt-4 h-3 max-w-xl rounded bg-zinc-800">
                    <div className="h-3 rounded bg-foxtrot-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="mx-auto mt-5 max-w-md text-left">
                    <Field label="Tarefa vinculada" htmlFor="session-task">
                      <Select id="session-task" value={selectedTaskId} onChange={(event) => setSelectedTaskId(event.target.value)}>
                        <option value="">Sem tarefa vinculada</option>
                        {dashboard.tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                      </Select>
                    </Field>
                  </div>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Button disabled={running} type="button" onClick={startTimer}>
                      <Play className="h-4 w-4" aria-hidden /> Iniciar
                    </Button>
                    <Button disabled={!running} type="button" variant="ghost" onClick={pauseTimer}>
                      <Pause className="h-4 w-4" aria-hidden /> Pausar
                    </Button>
                    <Button type="button" variant="ghost" onClick={resetTimer}>
                      <RotateCcw className="h-4 w-4" aria-hidden /> Zerar
                    </Button>
                    <Button disabled={saving || elapsed < 1} type="button" variant="secondary" onClick={() => void finishSession()}>
                      <Save className="h-4 w-4" aria-hidden /> Registrar
                    </Button>
                  </div>
                </Card>

                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold uppercase text-white">Flashcards</h2>
                      <p className="mt-1 text-sm text-zinc-400">Revise cards vencidos, marque favoritos e acompanhe a repeticao espacada.</p>
                    </div>
                    <Tabs
                      items={[
                        { id: "due", label: "Vencidos" },
                        { id: "favorites", label: "Favoritos" },
                        { id: "all", label: "Todos" }
                      ]}
                      value={flashcardFilter}
                      onChange={setFlashcardFilter}
                    />
                  </div>

                  <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]" onSubmit={submitCard}>
                    <Field label="Frente" htmlFor="card-front">
                      <Textarea id="card-front" value={cardForm.front} onChange={(event) => setCardForm((current) => ({ ...current, front: event.target.value }))} />
                    </Field>
                    <Field label="Verso" htmlFor="card-back">
                      <Textarea id="card-back" value={cardForm.back} onChange={(event) => setCardForm((current) => ({ ...current, back: event.target.value }))} />
                    </Field>
                    <div className="grid content-end gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
                        <input className="h-4 w-4 accent-orange-500" type="checkbox" checked={cardForm.favorite} onChange={(event) => setCardForm((current) => ({ ...current, favorite: event.target.checked }))} />
                        Favorito
                      </label>
                      <Button disabled={saving || !cardForm.front.trim() || !cardForm.back.trim()} type="submit">
                        <BookOpenCheck className="h-4 w-4" aria-hidden /> Criar
                      </Button>
                    </div>
                  </form>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {flashcards.map((card) => (
                      <article key={card.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase text-zinc-500">Vence {String(card.dueAt).slice(0, 10)} / {card.repetitions} revisoes</p>
                            <h3 className="mt-1 break-words font-semibold text-white">{card.front}</h3>
                          </div>
                          <button
                            aria-label={card.favorite ? "Remover flashcard dos favoritos" : "Adicionar flashcard aos favoritos"}
                            className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foxtrot-500"
                            disabled={saving}
                            onClick={() => void toggleFavorite(card)}
                            type="button"
                          >
                            <Heart className={cn("h-5 w-5", card.favorite ? "fill-red-500 text-red-500" : "text-zinc-500")} aria-hidden />
                          </button>
                        </div>
                        {revealedCardId === card.id ? (
                          <div className="mt-3">
                            <p className="rounded bg-zinc-950 p-3 text-sm text-zinc-300">{card.back}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {[2, 3, 4, 5].map((quality) => (
                                <Button disabled={saving} key={quality} type="button" variant="ghost" onClick={() => void reviewCard(card.id, quality)}>
                                  Nota {quality}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Button className="mt-3" type="button" variant="ghost" onClick={() => setRevealedCardId(card.id)}>Revelar</Button>
                        )}
                      </article>
                    ))}
                    {flashcards.length === 0 && <EmptyState title="Nenhum flashcard" description="Crie ou altere o filtro para encontrar cards de revisao." />}
                  </div>
                </Card>
              </section>

              <aside className="grid content-start gap-4">
                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Sons de foco</h2>
                  <div className="mt-4 grid gap-3">
                    {soundLabels.map((sound) => (
                      <div key={sound.key} className="grid grid-cols-[1fr_120px] items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-2">
                          <Volume2 className="h-4 w-4 text-foxtrot-400" aria-hidden /> {sound.label}
                        </span>
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
                    <Button disabled={saving} type="button" variant="ghost" onClick={() => void saveSounds()}>
                      <Save className="h-4 w-4" aria-hidden /> Salvar sons
                    </Button>
                  </div>
                </Card>

                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Sessoes recentes</h2>
                  <div className="mt-4 grid gap-2">
                    {dashboard.sessions.map((session) => (
                      <p key={session.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">
                        {session.mode === "POMODORO" ? "Pomodoro" : "Livre"} / {formatDuration(session.netSeconds)} / {String(session.startedAt).slice(0, 10)}
                      </p>
                    ))}
                    {dashboard.sessions.length === 0 && <p className="text-sm text-zinc-500">Nenhuma sessao registrada.</p>}
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-bold uppercase text-white">Consistencia</h2>
                    <Badge tone="brand">{consistencyPercent(dashboard.consistency)}%</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-2">
                    {dashboard.consistency.days.map((day) => (
                      <div key={day.date} title={`${day.date}: ${formatDuration(day.netSeconds)}`} className={cn("h-9 rounded-md border border-zinc-800", day.active ? "bg-foxtrot-500" : "bg-zinc-900")} />
                    ))}
                  </div>
                </Card>
              </aside>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
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
