import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@foxtrot/ui";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  aside,
  footer
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-zinc-950 lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="relative hidden overflow-hidden border-r border-zinc-800 lg:block">
        <img
          alt="Ambiente de estudos Foxtrot"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/92 to-zinc-950/72" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <BrandMark />
          <div className="max-w-2xl">
            <p className="font-display text-sm font-bold uppercase text-foxtrot-400">{eyebrow}</p>
            <h1 className="mt-3 font-display text-5xl font-black uppercase leading-none text-white">{title}</h1>
            <p className="mt-4 text-base leading-7 text-zinc-300">{description}</p>
            {aside && <div className="mt-8">{aside}</div>}
          </div>
          <Link className="text-sm text-zinc-500 hover:text-foxtrot-300" href="/">
            Voltar ao portal
          </Link>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          {children}
          {footer && <div className="mt-5 text-center text-sm text-zinc-500">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
