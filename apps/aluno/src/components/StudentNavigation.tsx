"use client";

import Link from "next/link";
import { BookOpen, Bot, CalendarDays, Clock, CreditCard, Home, Target, Trophy, UserCircle } from "lucide-react";
import { BrandMark, cn, useAuthSession } from "@foxtrot/ui";

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/cursos", label: "Cursos", icon: BookOpen },
  { href: "/questoes", label: "Questoes", icon: Target },
  { href: "/planejamento", label: "Plano", ariaLabel: "Planejamento", icon: CalendarDays },
  { href: "/foco", label: "Foco", icon: Clock },
  { href: "/gamificacao", label: "Ranking", icon: Trophy },
  { href: "/ia", label: "IA", icon: Bot },
  { href: "/assinaturas", label: "Planos", icon: CreditCard }
];

export function StudentNavigation({ activeHref = "/" }: { activeHref?: string }) {
  const session = useAuthSession();
  const accountHref = session.status === "authenticated" ? "/conta" : "/login";
  const accountLabel = session.status === "authenticated" ? (session.user?.nickname ?? "Conta") : "Entrar";

  return (
    <nav className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur" aria-label="Navegacao do aluno">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link aria-label="Ir para o inicio" href="/">
          <BrandMark />
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                aria-current={activeHref === item.href ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foxtrot-500",
                  activeHref === item.href && "bg-zinc-800 text-white"
                )}
                href={item.href}
                key={item.href}
                aria-label={item.ariaLabel ?? item.label}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
        <Link
          className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foxtrot-500"
          href={accountHref}
        >
          <UserCircle className="h-4 w-4" aria-hidden />
          {accountLabel}
        </Link>
      </div>
      <div className="border-t border-zinc-900 px-4 pb-3 lg:hidden">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pt-3 foxtrot-scrollbar" role="list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                aria-current={activeHref === item.href ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-semibold text-zinc-200 hover:bg-zinc-800",
                  activeHref === item.href && "bg-zinc-800 text-white"
                )}
                href={item.href}
                key={item.href}
                aria-label={item.ariaLabel ?? item.label}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
