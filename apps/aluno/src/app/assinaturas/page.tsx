"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, History, Loader2, ShieldCheck, TicketPercent, XCircle } from "lucide-react";
import { BrandMark, Button, StatCard, cn } from "@foxtrot/ui";
import {
  FinancialHistory,
  Plan,
  cancelSubscription,
  createCheckout,
  fetchFinancialHistory,
  fetchPlans,
  formatMoney,
  intervalLabel
} from "../../lib/payments";

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [history, setHistory] = useState<FinancialHistory | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0], [plans, selectedPlanId]);
  const activeSubscription = useMemo(() => history?.subscriptions.find((item) => item.status === "ACTIVE" || item.status === "PAST_DUE") ?? null, [history]);

  async function load() {
    setLoading(true);
    setStatus("");
    try {
      const [nextPlans, nextHistory] = await Promise.all([fetchPlans(), fetchFinancialHistory()]);
      setPlans(nextPlans);
      setHistory(nextHistory);
      setSelectedPlanId((current) => current || nextPlans[0]?.id || "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel carregar assinaturas.");
    } finally {
      setLoading(false);
    }
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPlan) return;
    setSaving(true);
    setStatus("");
    try {
      const checkout = await createCheckout({
        planId: selectedPlan.id,
        couponCode: couponCode.trim() || undefined,
        idempotencyKey: `checkout-${selectedPlan.id}-${Date.now()}`
      });
      if (checkout.checkoutUrl) window.location.href = checkout.checkoutUrl;
      else {
        setStatus("Checkout criado, mas o provedor nao retornou URL.");
        await load();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel iniciar checkout.");
    } finally {
      setSaving(false);
    }
  }

  async function cancel(id: string) {
    setSaving(true);
    setStatus("");
    try {
      await cancelSubscription(id);
      setStatus("Cancelamento solicitado.");
      await load();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel cancelar assinatura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/"><BrandMark /></Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800" href="/gamificacao"><ShieldCheck className="h-4 w-4" /> Minha conta</Link>
        </div>
      </header>

      <section className="border-b border-zinc-800">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-foxtrot-300">Planos e assinaturas</p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase text-white">Checkout</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Acesso" value={history?.access.active ? "Ativo" : "Inativo"} />
            <StatCard icon={<CreditCard className="h-4 w-4" />} label="Assinatura" value={activeSubscription?.status ?? "Nenhuma"} tone="red" />
            <StatCard icon={<History className="h-4 w-4" />} label="Pagamentos" value={String(history?.payments.length ?? 0)} />
            <StatCard icon={<TicketPercent className="h-4 w-4" />} label="Cupom" value={couponCode || "Opcional"} tone="zinc" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        {status && <p className="rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300 lg:col-span-2">{status}</p>}
        {loading ? (
          <Empty text="Carregando planos." />
        ) : (
          <>
            <section className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn("rounded-md border p-5 text-left hover:border-foxtrot-500", selectedPlan?.id === plan.id ? "border-foxtrot-500 bg-foxtrot-950/20" : "border-zinc-800 bg-zinc-950")}
                  >
                    <span className="text-xs uppercase text-zinc-500">{intervalLabel(plan.interval)}</span>
                    <strong className="mt-2 block font-display text-2xl font-black uppercase text-white">{plan.name}</strong>
                    <span className="mt-2 block text-sm text-zinc-400">{plan.description}</span>
                    <span className="mt-4 block text-xl font-bold text-foxtrot-400">{formatMoney(plan.amountCents, plan.currency)}</span>
                  </button>
                ))}
              </div>

              <form className="rounded-md border border-zinc-800 bg-zinc-950 p-5" onSubmit={submitCheckout}>
                <h1 className="font-display text-2xl font-black uppercase text-white">Checkout</h1>
                <p className="mt-1 text-sm text-zinc-400">Pagamento processado pelo provedor configurado no backend.</p>
                <label className="mt-5 block text-xs uppercase text-zinc-500">
                  Cupom
                  <input className="mt-1 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-orange-500" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="FOXTROT10" />
                </label>
                <Button className="mt-4" disabled={saving || !selectedPlan} type="submit">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Ir para pagamento
                </Button>
              </form>
            </section>

            <aside className="grid content-start gap-4">
              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Assinaturas</h2>
                <div className="mt-4 grid gap-3">
                  {history?.subscriptions.map((subscription) => (
                    <article key={subscription.id} className="rounded border border-zinc-800 p-3 text-sm">
                      <strong className="block text-white">{subscription.plan.name}</strong>
                      <span className="mt-1 block text-zinc-400">{subscription.status} / vence {subscription.currentPeriodEnd?.slice(0, 10) ?? "sem data"}</span>
                      {subscription.status !== "CANCELED" && (
                        <Button className="mt-3" disabled={saving} variant="ghost" type="button" onClick={() => void cancel(subscription.id)}>
                          <XCircle className="h-4 w-4" /> Cancelar
                        </Button>
                      )}
                    </article>
                  ))}
                  {!history?.subscriptions.length && <p className="text-sm text-zinc-500">Nenhuma assinatura ainda.</p>}
                </div>
              </section>

              <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
                <h2 className="font-display text-xl font-bold uppercase text-white">Historico financeiro</h2>
                <div className="mt-4 grid gap-2">
                  {history?.payments.map((payment) => (
                    <p key={payment.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">
                      {payment.plan?.name ?? "Pagamento"} / {payment.status} / {formatMoney(payment.amountCents, payment.currency)}
                    </p>
                  ))}
                  {!history?.payments.length && <p className="text-sm text-zinc-500">Nenhum pagamento registrado.</p>}
                </div>
              </section>
            </aside>
          </>
        )}
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">{text}</p>;
}
