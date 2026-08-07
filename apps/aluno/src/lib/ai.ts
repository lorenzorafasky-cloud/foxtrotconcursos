import { apiRequest } from "./api";

export type AiSearchResult = {
  type: string;
  id: string;
  title: string;
  excerpt: string;
  url: string;
  score: number;
};

export type AiSearchResponse = {
  query: string;
  results: AiSearchResult[];
  answer?: string;
};

export type AiUsage = {
  id: string;
  provider: string;
  model: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  createdAt: string;
};

export function smartSearch(q: string, includeAi = false) {
  const params = new URLSearchParams({ q });
  if (includeAi) params.set("includeAi", "true");
  return apiRequest<AiSearchResponse>(`/ai/search?${params}`);
}

export function askStudySupport(body: { question: string; lessonId?: string; questionId?: string }) {
  return apiRequest<{ answer: string; usage: { provider: string; model: string; inputTokens: number; outputTokens: number; costCents: number } }>("/ai/study-support", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function fetchAiUsage() {
  return apiRequest<AiUsage[]>("/ai/usage");
}

export function formatCost(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
