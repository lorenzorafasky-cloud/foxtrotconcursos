import Link from "next/link";
import { XCircle } from "lucide-react";
import { BrandMark } from "@foxtrot/ui";

export default function PaymentCanceledPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100">
      <BrandMark />
      <section className="mx-auto mt-20 max-w-xl rounded-md border border-zinc-800 bg-zinc-950 p-8 text-center">
        <XCircle className="mx-auto h-10 w-10 text-red-400" />
        <h1 className="mt-4 font-display text-3xl font-black uppercase text-white">Checkout cancelado</h1>
        <p className="mt-3 text-sm text-zinc-400">Nenhuma cobranca foi confirmada. Voce pode escolher outro plano quando quiser.</p>
        <Link className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-foxtrot-500 px-4 text-sm font-semibold text-white hover:bg-foxtrot-600" href="/assinaturas">
          Voltar aos planos
        </Link>
      </section>
    </main>
  );
}
