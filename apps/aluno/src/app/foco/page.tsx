import { Flame, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { BrandMark, Button, StatCard } from "@foxtrot/ui";

export default function FocusPage() {
  const sounds = ["Chuva", "Fogueira", "Tempestade", "Ruido branco", "Ruido rosa"];

  return (
    <main className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandMark />
          <Button variant="secondary"><Flame className="h-4 w-4" /> Ofensiva 12 dias</Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <section className="rounded-md border border-zinc-800 bg-zinc-950 p-6 text-center">
          <p className="font-display text-sm font-bold uppercase text-foxtrot-400">Pomodoro configuravel</p>
          <strong className="mt-4 block font-display text-7xl font-black text-white">25:00</strong>
          <div className="mt-6 flex justify-center gap-3">
            <Button><Play className="h-4 w-4" /> Iniciar</Button>
            <Button variant="ghost"><Pause className="h-4 w-4" /> Pausar</Button>
            <Button variant="ghost"><RotateCcw className="h-4 w-4" /> Zerar</Button>
          </div>
        </section>
        <aside className="grid gap-4">
          <StatCard icon={<Flame className="h-4 w-4" />} label="Horas liquidas hoje" value="3h20" />
          <StatCard icon={<Flame className="h-4 w-4" />} label="Dias para prova" value="284" tone="red" />
          <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-display text-xl font-bold uppercase text-white">Sons de foco</h2>
            <div className="mt-4 grid gap-3">
              {sounds.map((sound) => (
                <div key={sound} className="grid grid-cols-[1fr_120px] items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-2"><Volume2 className="h-4 w-4 text-foxtrot-400" /> {sound}</span>
                  <input aria-label={sound} className="accent-orange-500" type="range" min="0" max="100" defaultValue="35" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
