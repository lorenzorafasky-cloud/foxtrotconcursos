import Link from "next/link";
import { BrandMark } from "@foxtrot/ui";

type LegalPageProps = {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
};

export function LegalPage({ title, updatedAt, children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/">
            <BrandMark />
          </Link>
          <Link className="text-sm font-semibold text-zinc-300 hover:text-white" href="/">
            Voltar
          </Link>
        </div>
      </nav>
      <article className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm font-semibold uppercase text-foxtrot-300">Foxtrot Concursos</p>
        <h1 className="mt-2 font-display text-4xl font-black uppercase text-white md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-zinc-400">Ultima atualizacao: {updatedAt}</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-zinc-300 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-black [&_h2]:uppercase [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </main>
  );
}
