"use client";

import { FormEvent, useState } from "react";
import { Target } from "lucide-react";
import { Button, Card, ErrorState, Field, Input, PageHeader } from "@foxtrot/ui";
import { StudentNavigation } from "../../components/StudentNavigation";
import { apiRequest } from "../../lib/api";

export default function OnboardingPage() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const age = Number(form.get("age"));
    const dailyNetStudyGoalMins = Number(form.get("dailyNetStudyGoalMins"));
    const weeklyQuestionGoal = Number(form.get("weeklyQuestionGoal"));
    setStatus("");
    setError("");

    if (!Number.isFinite(age) || age < 13) return setError("Informe uma idade valida.");
    if (!form.get("studyExperience") || !form.get("careerGoal")) return setError("Informe experiencia de estudo e carreira objetivo.");
    if (dailyNetStudyGoalMins < 1 || weeklyQuestionGoal < 1) return setError("Informe metas maiores que zero.");

    setSaving(true);
    try {
      await apiRequest("/auth/onboarding", {
        method: "POST",
        body: JSON.stringify({
          age,
          studyExperience: form.get("studyExperience"),
          careerGoal: form.get("careerGoal"),
          platformGoals: ["aprovacao rapida", "revisao"],
          dailyNetStudyGoalMins,
          weeklyQuestionGoal,
          examDate: form.get("examDate") || undefined
        })
      });
      setStatus("Perfil salvo. Ranking e metas ajustados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar onboarding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <StudentNavigation activeHref="/" />
      <PageHeader
        eyebrow="Primeira configuracao"
        title="Perfil de estudo"
        description="Esses dados alimentam metas, ranking por concurso-alvo e recomendacoes conectadas a sua conta."
      />
      <div className="mx-auto max-w-3xl px-4 py-6">
        {error && <ErrorState description={error} />}
        {status && <p className="mb-4 rounded-md border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-100">{status}</p>}
        <Card>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <Field label="Idade" htmlFor="age">
              <Input id="age" name="age" min="13" type="number" required />
            </Field>
            <Field label="Tempo de estudo" htmlFor="studyExperience">
              <Input id="studyExperience" name="studyExperience" required />
            </Field>
            <Field label="Carreira objetivo" htmlFor="careerGoal">
              <Input id="careerGoal" name="careerGoal" required />
            </Field>
            <Field label="Minutos liquidos por dia" htmlFor="dailyNetStudyGoalMins">
              <Input id="dailyNetStudyGoalMins" name="dailyNetStudyGoalMins" min="1" type="number" required />
            </Field>
            <Field label="Questoes por semana" htmlFor="weeklyQuestionGoal">
              <Input id="weeklyQuestionGoal" name="weeklyQuestionGoal" min="1" type="number" required />
            </Field>
            <Field label="Data da prova" htmlFor="examDate" hint="Opcional.">
              <Input id="examDate" name="examDate" type="date" />
            </Field>
            <div className="md:col-span-2">
              <Button disabled={saving} type="submit">
                <Target className="h-4 w-4" aria-hidden /> Salvar perfil
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
