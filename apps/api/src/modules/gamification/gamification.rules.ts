export type XpRule = {
  key: string;
  source: string;
  points: number;
  dailyCap: number;
  description: string;
};

export const XP_RULES: XpRule[] = [
  {
    key: "question.correct",
    source: "question:correct",
    points: 10,
    dailyCap: 300,
    description: "Questao objetiva correta vale 10 XP, limitada a 300 XP por dia."
  },
  {
    key: "focus.net-minute",
    source: "focus:net-minutes",
    points: 1,
    dailyCap: 480,
    description: "Cada minuto liquido de foco vale 1 XP, limitada a 480 XP por dia."
  },
  {
    key: "planner.task-complete",
    source: "planner:task-complete",
    points: 5,
    dailyCap: 100,
    description: "Tarefa de estudo concluida vale 5 XP, limitada a 100 XP por dia."
  },
  {
    key: "flashcard.review",
    source: "flashcard:review",
    points: 3,
    dailyCap: 150,
    description: "Revisao de flashcard vale ate 3 XP auditaveis, limitada a 150 XP por dia."
  },
  {
    key: "achievement.reward",
    source: "achievement:reward",
    points: 0,
    dailyCap: 500,
    description: "Conquista pode conceder XP bonus definido na propria conquista."
  },
  {
    key: "challenge.reward",
    source: "challenge:reward",
    points: 0,
    dailyCap: 500,
    description: "Desafio concluido pode conceder XP bonus definido no desafio."
  }
];

export function ruleForSource(source: string) {
  return XP_RULES.find((rule) => rule.source === source);
}

export function levelForXp(xp: number) {
  const normalized = Math.max(0, xp);
  const level = Math.floor(Math.sqrt(normalized / 120)) + 1;
  const currentLevelXp = Math.pow(level - 1, 2) * 120;
  const nextLevelXp = Math.pow(level, 2) * 120;
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progressPercent: nextLevelXp === currentLevelXp ? 100 : Math.round(((normalized - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)
  };
}

export const DEFAULT_ACHIEVEMENTS = [
  {
    key: "first-focus-session",
    title: "Primeira Area Foco",
    description: "Registrou a primeira sessao de foco.",
    icon: "timer",
    xpReward: 20,
    requirement: { metric: "focusSessions", target: 1 }
  },
  {
    key: "ten-correct-questions",
    title: "Mira calibrada",
    description: "Acertou 10 questoes.",
    icon: "target",
    xpReward: 50,
    requirement: { metric: "correctQuestions", target: 10 }
  },
  {
    key: "five-day-streak",
    title: "Consistencia operacional",
    description: "Manteve 5 dias ativos de estudo.",
    icon: "flame",
    xpReward: 80,
    requirement: { metric: "streakDays", target: 5 }
  },
  {
    key: "thousand-xp",
    title: "Subida de patente",
    description: "Alcancou 1000 XP acumulados.",
    icon: "trophy",
    xpReward: 120,
    requirement: { metric: "totalXp", target: 1000 }
  }
];
