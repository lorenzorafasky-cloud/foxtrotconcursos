import { Injectable, ServiceUnavailableException } from "@nestjs/common";

@Injectable()
export class AiService {
  async answerQuestion(statement: string, context: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException("ANTHROPIC_API_KEY nao configurada.");
    }
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `Responda em pt-BR somente com base no contexto.\n\nContexto:\n${context}\n\nQuestao:\n${statement}`
          }
        ]
      })
    });
    if (!response.ok) throw new ServiceUnavailableException("Falha ao consultar IA.");
    const payload = (await response.json()) as { content?: Array<{ text?: string }> };
    return payload.content?.map((part) => part.text).filter(Boolean).join("\n") ?? "";
  }
}
