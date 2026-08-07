import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { BrandMark } from "@foxtrot/ui";

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100">
      <BrandMark />
      <section className="mx-auto mt-20 max-w-xl rounded-md border border-zinc-800 bg-zinc-950 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <h1 className="mt-4 font-display text-3xl font-black uppercase text-white">Pagamento em confirmacao</h1>
        <p className="mt-3 text-sm text-zinc-400">Assim que o webhook do provedor confirmar, seu acesso aparece na area financeira.</p>
        <Link className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/assinaturas">
          Ver assinatura
        </Link>
      </section>
    </main>
  );
}
