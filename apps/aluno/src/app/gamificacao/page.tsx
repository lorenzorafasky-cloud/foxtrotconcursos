"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Flame, Medal, Radio, ShieldCheck, Star, Target, Trophy, Zap } from "lucide-react";
import { BrandMark, Button, StatCard, cn } from "@foxtrot/ui";
import {
  GamificationDashboard,
  Leaderboard,
  createGamificationStream,
  fetchGamificationDashboard,
  joinChallenge,
  markNotificationRead
} from "../../lib/gamification";

export default function GamificationPage() {
  const [dashboard, setDashboard] = useState<GamificationDashboard | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [live, setLive] = useState(false);

  useEffect(() => {
    void load();
    const stream = createGamificationStream((event) => {
      setLive(true);
      const payload = JSON.parse(event.data as string) as GamificationDashboard | Leaderboard | unknown;
      if (event.type === "dashboard") {
        setDashboard(payload as GamificationDashboard);
        setLeaderboard((payload as GamificationDashboard).leaderboard);
      }
      if (event.type === "leaderboard") setLeaderboard(payload as Leaderboard);
      if (event.type === "notification" || event.type === "xp") void load(false);
    });
    stream.onerror = () => setLive(false);
    return () => stream.close();
  }, []);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setStatus("");
    try {
      const next = await fetchGamificationDashboard();
      setDashboard(next);
      setLeaderboard(next.leaderboard);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar a gamificacao.");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setStatus("");
    try {
      await action();
      setStatus(success);
      await load(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel concluir a acao.");
    } finally {
      setSaving(false);
    }
  }

  const unread = useMemo(() => dashboard?.notifications.filter((item) => !item.readAt).length ?? 0, [dashboard]);
  const unlocked = useMemo(() => dashboard?.achievements.filter((item) => item.unlocked).length ?? 0, [dashboard]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/"><BrandMark /></Link>
          <div className="flex items-center gap-2">
            <span className={cn("hidden items-center gap-2 rounded-md border px-3 py-2 text-xs uppercase md:inline-flex", live ? "border-emerald-900 text-emerald-300" : "border-zinc-800 text-zinc-500")}>
              <Radio className="h-4 w-4" /> {live ? "Tempo real" : "Reconectando"}
            </span>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/foco"><Flame className="h-4 w-4" /> Foco</Link>
          </div>
        </div>
      </header>

      <section className="border-b border-zinc-800">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-6 md:grid-cols-4">
          <StatCard icon={<Zap className="h-4 w-4" />} label="XP total" value={String(dashboard?.totalXp ?? 0)} />
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Nivel" value={String(dashboard?.level.level ?? 1)} tone="red" />
          <StatCard icon={<Medal className="h-4 w-4" />} label="Conquistas" value={`${unlocked}/${dashboard?.achievements.length ?? 0}`} />
          <StatCard icon={<Bell className="h-4 w-4" />} label="Notificacoes" value={String(unread)} tone="zinc" />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {status && <p className="mb-4 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">{status}</p>}
        {loading ? (
          <Empty text="Carregando gamificacao." />
        ) : dashboard ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="grid gap-6">
              <article className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="font-display text-3xl font-black uppercase text-white">Patente nivel {dashboard.level.level}</h1>
                    <p className="mt-1 text-sm text-zinc-400">Ranking semanal: {dashboard.rankingPosition ? `#${dashboard.rankingPosition}` : "fora do top 50"}</p>
                  </div>
                  <ShieldCheck className="h-8 w-8 text-foxtrot-400" />
                </div>
                <div className="mt-5">
                  <div className="flex justify-between text-xs uppercase text-zinc-500">
                    <span>{dashboard.level.currentLevelXp} XP</span>
                    <span>{dashboard.level.nextLevelXp} XP</span>
                  </div>
                  <div className="mt-2 h-3 rounded bg-zinc-800">
                    <div className="h-3 rounded bg-foxtrot-500" style={{ width: `${dashboard.level.progressPercent}%` }} />
                  </div>
                </div>
              </article>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Desafios</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {dashboard.challenges.map((challenge) => (
                    <article key={challenge.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">{challenge.title}</h3>
                          <p className="mt-1 text-sm text-zinc-400">{challenge.description}</p>
                        </div>
                        <Target className="h-5 w-5 text-foxtrot-400" />
                      </div>
                      <div className="mt-4 h-2 rounded bg-zinc-800">
                        <div className="h-2 rounded bg-foxtrot-500" style={{ width: `${challenge.progressPercent}%` }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs uppercase text-zinc-500">
                        <span>{challenge.computedProgress}/{challenge.targetValue}</span>
                        <span>+{challenge.rewardXp} XP</span>
                      </div>
                      {challenge.participation ? (
                        <p className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Participando</p>
                      ) : (
                        <Button className="mt-3" disabled={saving} type="button" onClick={() => void runAction(() => joinChallenge(challenge.id), "Desafio iniciado.")}>Entrar</Button>
                      )}
                    </article>
                  ))}
                  {dashboard.challenges.length === 0 && <Empty text="Nenhum desafio ativo." />}
                </div>
              </section>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Conquistas</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {dashboard.achievements.map((achievement) => (
                    <article key={achievement.id} className={cn("rounded-md border p-4", achievement.unlocked ? "border-foxtrot-700 bg-foxtrot-950/30" : "border-zinc-800 bg-zinc-900")}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">{achievement.title}</h3>
                          <p className="mt-1 text-sm text-zinc-400">{achievement.description}</p>
                        </div>
                        <Star className={cn("h-5 w-5", achievement.unlocked ? "fill-orange-500 text-foxtrot-400" : "text-zinc-600")} />
                      </div>
                      <div className="mt-4 h-2 rounded bg-zinc-800">
                        <div className="h-2 rounded bg-foxtrot-500" style={{ width: `${achievement.progressPercent}%` }} />
                      </div>
                      <p className="mt-2 text-xs uppercase text-zinc-500">{achievement.progress}/{achievement.requirement.target} / +{achievement.xpReward} XP</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Regras de pontuacao</h2>
                <div className="mt-4 grid gap-2">
                  {dashboard.rules.map((rule) => (
                    <p key={rule.key} className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">{rule.description}</p>
                  ))}
                </div>
              </section>
            </section>

            <aside className="grid content-start gap-4">
              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Ranking semanal</h2>
                <div className="mt-4 grid gap-2">
                  {(leaderboard ?? dashboard.leaderboard).entries.map((entry) => (
                    <div key={entry.userId} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded border border-zinc-800 p-3 text-sm">
                      <strong className="text-foxtrot-400">#{entry.position}</strong>
                      <span>{entry.nickname}</span>
                      <span className="text-zinc-400">{entry.xp} XP</span>
                    </div>
                  ))}
                  {(leaderboard ?? dashboard.leaderboard).entries.length === 0 && <p className="text-sm text-zinc-500">Ranking sem eventos nesta janela.</p>}
                </div>
              </section>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Notificacoes</h2>
                <div className="mt-4 grid gap-2">
                  {dashboard.notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => !notification.readAt && void runAction(() => markNotificationRead(notification.id), "Notificacao marcada como lida.")}
                      className={cn("rounded border p-3 text-left text-sm", notification.readAt ? "border-zinc-800 text-zinc-500" : "border-foxtrot-800 bg-foxtrot-950/20 text-zinc-200")}
                    >
                      <span className="block font-semibold text-white">{notification.title}</span>
                      <span className="mt-1 block">{notification.body}</span>
                    </button>
                  ))}
                  {dashboard.notifications.length === 0 && <p className="text-sm text-zinc-500">Nenhuma notificacao.</p>}
                </div>
              </section>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">XP recente</h2>
                <div className="mt-4 grid gap-2">
                  {dashboard.recentXp.map((event) => (
                    <p key={event.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">+{event.points} XP / {event.source}</p>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">{text}</p>;
}
