"use client";

import { FormEvent, useState } from "react";
import { Target } from "lucide-react";
import { BrandMark, Button } from "@foxtrot/ui";
import { apiRequest } from "../../lib/api";

export default function OnboardingPage() {
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Salvando perfil...");
    try {
      await apiRequest("/auth/onboarding", {
        method: "POST",
        body: JSON.stringify({
          age: Number(form.get("age")),
          studyExperience: form.get("studyExperience"),
          careerGoal: form.get("careerGoal"),
          platformGoals: ["aprovacao rapida", "revisao"],
          dailyNetStudyGoalMins: Number(form.get("dailyNetStudyGoalMins")),
          weeklyQuestionGoal: Number(form.get("weeklyQuestionGoal")),
          examDate: form.get("examDate") || undefined
        })
      });
      setStatus("Perfil salvo. Ranking e metas ajustados.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao salvar onboarding.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8">
      <form onSubmit={submit} className="mx-auto max-w-3xl rounded-md border border-zinc-800 bg-zinc-950 p-6">
        <BrandMark />
        <h1 className="mt-8 font-display text-4xl font-black uppercase text-white">Perfil de combate</h1>
        <p className="mt-2 text-sm text-zinc-400">Esses dados alimentam metas, ranking por concurso-alvo e recomendacoes.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-300">Idade<input name="age" className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white" type="number" defaultValue="28" /></label>
          <label className="text-sm text-zinc-300">Tempo de estudo<input name="studyExperience" className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white" defaultValue="1 a 2 anos" /></label>
          <label className="text-sm text-zinc-300">Carreira objetivo<input name="careerGoal" className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white" defaultValue="Policial" /></label>
          <label className="text-sm text-zinc-300">Horas liquidas por dia<input name="dailyNetStudyGoalMins" className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white" type="number" defaultValue="180" /></label>
          <label className="text-sm text-zinc-300">Questoes por semana<input name="weeklyQuestionGoal" className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white" type="number" defaultValue="150" /></label>
          <label className="text-sm text-zinc-300">Data da prova<input name="examDate" className="mt-2 h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-white" type="date" /></label>
        </div>
        <Button className="mt-6" type="submit"><Target className="h-4 w-4" /> Salvar perfil</Button>
        <p className="mt-4 min-h-5 text-sm text-zinc-400">{status}</p>
      </form>
    </main>
  );
}
