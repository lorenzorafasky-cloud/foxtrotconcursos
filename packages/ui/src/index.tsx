import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Shield, Target, Timer, Trophy } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-foxtrot-500 disabled:opacity-60",
        variant === "primary" && "bg-foxtrot-500 text-white hover:bg-foxtrot-600",
        variant === "secondary" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "bg-transparent text-zinc-100 hover:bg-zinc-800",
        className
      )}
      {...props}
    />
  );
}

export function StatCard({
  icon,
  label,
  value,
  tone = "orange"
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "orange" | "red" | "zinc";
}) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
      <div
        className={cn(
          "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md",
          tone === "orange" && "bg-foxtrot-500/15 text-foxtrot-400",
          tone === "red" && "bg-red-600/15 text-red-400",
          tone === "zinc" && "bg-zinc-800 text-zinc-200"
        )}
      >
        {icon}
      </div>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <strong className="font-display text-2xl text-white">{value}</strong>
    </section>
  );
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foxtrot-500 text-white">
        <Shield aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <p className="font-display text-xl font-bold uppercase leading-none text-white">Foxtrot</p>
        <p className="text-xs uppercase tracking-wide text-foxtrot-300">Concursos</p>
      </div>
    </div>
  );
}

export function OperationsStrip() {
  const items = [
    { label: "Cursos", value: "124 aulas", icon: <Target className="h-4 w-4" /> },
    { label: "Foco", value: "3h20 liquidas", icon: <Timer className="h-4 w-4" /> },
    { label: "Ranking", value: "Top 8%", icon: <Trophy className="h-4 w-4" /> }
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <StatCard key={item.label} icon={item.icon} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
