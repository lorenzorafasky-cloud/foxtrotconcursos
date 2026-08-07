"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Flame, Medal, Radio, ShieldCheck, Star, Target, Timer, Trophy, Zap } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
  Tabs,
  cn
} from "@foxtrot/ui";
import { StudentNavigation } from "../../components/StudentNavigation";
import {
  GamificationDashboard,
  Leaderboard,
  achievementStatusLabel,
  challengeTimeLeftLabel,
  countUnreadNotifications,
  createGamificationStream,
  fetchGamificationDashboard,
  fetchLeaderboard,
  formatXpSource,
  joinChallenge,
  markNotificationRead,
  normalizeProgressPercent
} from "../../lib/gamification";

type Period = "daily" | "weekly" | "all";
type Status = { type: "success" | "error"; message: string } | null;

export default function GamificationPage() {
  const [dashboard, setDashboard] = useState<GamificationDashboard | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [period, setPeriod] = useState<Period>("weekly");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    void load();
    const stream = createGamificationStream((event) => {
      setLive(true);
      try {
        const payload = JSON.parse(event.data as string) as GamificationDashboard | Leaderboard;
        if (event.type === "dashboard") {
          setDashboard(payload as GamificationDashboard);
          setLeaderboard((payload as GamificationDashboard).leaderboard);
        }
        if (event.type === "leaderboard") setLeaderboard(payload as Leaderboard);
        if (event.type === "notification" || event.type === "xp") void load(false);
      } catch {
        void load(false);
      }
    });
    stream.onerror = () => setLive(false);
    return () => stream.close();
  }, []);

  useEffect(() => {
    void loadLeaderboard(period);
  }, [period]);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setStatus(null);
    try {
      const next = await fetchGamificationDashboard();
      setDashboard(next);
      setLeaderboard(next.leaderboard);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel carregar a gamificacao." });
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaderboard(nextPeriod: Period) {
    try {
      setLeaderboard(await fetchLeaderboard(nextPeriod));
    } catch {
      setLeaderboard((current) => current);
    }
  }

  async function runAction(action: () => Promise<unknown>, success: string) {
    setSaving(true);
    setStatus(null);
    try {
      await action();
      setStatus({ type: "success", message: success });
      await load(false);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel concluir a acao." });
    } finally {
      setSaving(false);
    }
  }

  const unread = useMemo(() => countUnreadNotifications(dashboard?.notifications ?? []), [dashboard]);
  const unlocked = useMemo(() => dashboard?.achievements.filter((item) => item.unlocked).length ?? 0, [dashboard]);
  const activeLeaderboard = leaderboard ?? dashboard?.leaderboard;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <StudentNavigation activeHref="/gamificacao" />
      <PageHeader
        eyebrow="Evolucao do aluno"
        title="Gamificacao"
        description="Acompanhe XP, niveis, conquistas, desafios, ranking em tempo real e notificacoes da plataforma."
        actions={
          <>
            <span className={cn("inline-flex h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold uppercase", live ? "border-emerald-900 text-emerald-300" : "border-zinc-800 text-zinc-500")}>
              <Radio className="h-4 w-4" aria-hidden /> {live ? "Tempo real" : "Reconectando"}
            </span>
            <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-900" href="/foco">
              <Timer className="h-4 w-4" aria-hidden /> Area Foco
            </Link>
          </>
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {status?.type === "error" && <ErrorState description={status.message} action={<Button type="button" variant="outline" onClick={() => void load()}>Tentar novamente</Button>} />}
        {status?.type === "success" && <p className="mb-4 rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-100">{status.message}</p>}

        {loading ? (
          <LoadingState label="Carregando gamificacao..." />
        ) : dashboard ? (
          <div className="grid gap-6">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={<Zap className="h-4 w-4" aria-hidden />} label="XP total" value={String(dashboard.totalXp)} />
              <StatCard icon={<Trophy className="h-4 w-4" aria-hidden />} label="Nivel" value={String(dashboard.level.level)} tone="red" />
              <StatCard icon={<Medal className="h-4 w-4" aria-hidden />} label="Conquistas" value={`${unlocked}/${dashboard.achievements.length}`} tone="green" />
              <StatCard icon={<Bell className="h-4 w-4" aria-hidden />} label="Notificacoes" value={String(unread)} tone="zinc" />
              <StatCard icon={<Target className="h-4 w-4" aria-hidden />} label="Ranking" value={dashboard.rankingPosition ? `#${dashboard.rankingPosition}` : "Top 50"} tone="blue" />
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="grid gap-6">
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h1 className="font-display text-3xl font-black uppercase text-white">Nivel {dashboard.level.level}</h1>
                      <p className="mt-1 text-sm text-zinc-400">Progresso ate o proximo nivel e ultimos eventos de XP.</p>
                    </div>
                    <ShieldCheck className="h-8 w-8 text-foxtrot-400" aria-hidden />
                  </div>
                  <div className="mt-5">
                    <div className="flex justify-between text-xs uppercase text-zinc-500">
                      <span>{dashboard.level.currentLevelXp} XP</span>
                      <span>{dashboard.level.nextLevelXp} XP</span>
                    </div>
                    <div className="mt-2 h-3 rounded bg-zinc-800">
                      <div className="h-3 rounded bg-foxtrot-500" style={{ width: `${normalizeProgressPercent(dashboard.level.progressPercent)}%` }} />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 md:grid-cols-2">
                    {dashboard.recentXp.slice(0, 6).map((event) => (
                      <p key={event.id} className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
                        <strong className="text-white">+{event.points} XP</strong> / {formatXpSource(event.source)}
                      </p>
                    ))}
                    {dashboard.recentXp.length === 0 && <EmptyState title="Sem XP recente" description="Eventos aparecem aqui quando voce estuda, revisa e conclui desafios." />}
                  </div>
                </Card>

                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Desafios</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {dashboard.challenges.map((challenge) => (
                      <article key={challenge.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-white">{challenge.title}</h3>
                            <p className="mt-1 text-sm text-zinc-400">{challenge.description}</p>
                          </div>
                          <Target className="h-5 w-5 text-foxtrot-400" aria-hidden />
                        </div>
                        <div className="mt-4 h-2 rounded bg-zinc-800">
                          <div className="h-2 rounded bg-foxtrot-500" style={{ width: `${normalizeProgressPercent(challenge.progressPercent)}%` }} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase text-zinc-500">
                          <span>{challenge.computedProgress}/{challenge.targetValue}</span>
                          <span>{challengeTimeLeftLabel(challenge)}</span>
                          <span>+{challenge.rewardXp} XP</span>
                        </div>
                        {challenge.participation ? (
                          <p className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" aria-hidden /> Participando
                          </p>
                        ) : (
                          <Button className="mt-3" disabled={saving} type="button" onClick={() => void runAction(() => joinChallenge(challenge.id), "Desafio iniciado.")}>Entrar</Button>
                        )}
                      </article>
                    ))}
                    {dashboard.challenges.length === 0 && <EmptyState title="Sem desafios" description="Novos desafios aparecem quando forem publicados." />}
                  </div>
                </Card>

                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Conquistas</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {dashboard.achievements.map((achievement) => (
                      <article key={achievement.id} className={cn("rounded-md border p-4", achievement.unlocked ? "border-foxtrot-700 bg-foxtrot-950/30" : "border-zinc-800 bg-zinc-900")}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-white">{achievement.title}</h3>
                            <p className="mt-1 text-sm text-zinc-400">{achievement.description}</p>
                          </div>
                          <Star className={cn("h-5 w-5", achievement.unlocked ? "fill-orange-500 text-foxtrot-400" : "text-zinc-600")} aria-hidden />
                        </div>
                        <div className="mt-4 h-2 rounded bg-zinc-800">
                          <div className="h-2 rounded bg-foxtrot-500" style={{ width: `${normalizeProgressPercent(achievement.progressPercent)}%` }} />
                        </div>
                        <p className="mt-2 text-xs uppercase text-zinc-500">{achievementStatusLabel(achievement)} / +{achievement.xpReward} XP</p>
                      </article>
                    ))}
                    {dashboard.achievements.length === 0 && <EmptyState title="Sem conquistas" description="Conquistas configuradas pela administracao aparecem aqui." />}
                  </div>
                </Card>
              </section>

              <aside className="grid content-start gap-4">
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-bold uppercase text-white">Ranking</h2>
                    <Tabs
                      items={[
                        { id: "daily", label: "Dia" },
                        { id: "weekly", label: "Semana" },
                        { id: "all", label: "Geral" }
                      ]}
                      value={period}
                      onChange={setPeriod}
                    />
                  </div>
                  <div className="mt-4 grid gap-2">
                    {activeLeaderboard?.entries.map((entry) => (
                      <div key={entry.userId} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded border border-zinc-800 p-3 text-sm">
                        <strong className="text-foxtrot-400">#{entry.position}</strong>
                        <span className="truncate">{entry.nickname}</span>
                        <span className="text-zinc-400">{entry.xp} XP</span>
                      </div>
                    ))}
                    {!activeLeaderboard?.entries.length && <p className="text-sm text-zinc-500">Ranking sem eventos nesta janela.</p>}
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-bold uppercase text-white">Notificacoes</h2>
                    {unread > 0 && <Badge tone="brand">{unread} novas</Badge>}
                  </div>
                  <div className="mt-4 grid gap-2">
                    {dashboard.notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => !notification.readAt && void runAction(() => markNotificationRead(notification.id), "Notificacao marcada como lida.")}
                        className={cn(
                          "rounded border p-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foxtrot-500",
                          notification.readAt ? "border-zinc-800 text-zinc-500" : "border-foxtrot-800 bg-foxtrot-950/20 text-zinc-200"
                        )}
                      >
                        <span className="block font-semibold text-white">{notification.title}</span>
                        <span className="mt-1 block">{notification.body}</span>
                      </button>
                    ))}
                    {dashboard.notifications.length === 0 && <p className="text-sm text-zinc-500">Nenhuma notificacao.</p>}
                  </div>
                </Card>

                <Card>
                  <h2 className="font-display text-xl font-bold uppercase text-white">Regras de pontuacao</h2>
                  <div className="mt-4 grid gap-2">
                    {dashboard.rules.map((rule) => (
                      <p key={rule.key} className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
                        <strong className="text-white">+{rule.points} XP</strong> / {rule.description}
                      </p>
                    ))}
                    {dashboard.rules.length === 0 && <p className="text-sm text-zinc-500">Nenhuma regra ativa.</p>}
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
