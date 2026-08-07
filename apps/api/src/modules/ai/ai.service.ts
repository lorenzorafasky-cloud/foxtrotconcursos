import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { LessonAssetType, Prisma } from "@foxtrot/database";
import { PrismaService } from "../../core/prisma.service";

type AiCompletion = {
  text: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
};

type AuthLikeUser = { id: string; permissions?: string[]; roles?: string[] };
type AiDb = PrismaService & {
  aiUsageEvent: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown>;
    aggregate: (args: unknown) => Promise<{ _sum: { costCents: number | null } }>;
  };
  aiAutomationJob: {
    create: (args: unknown) => Promise<{ id: string; userId: string; type: string; input: Prisma.JsonValue; status: string }>;
    findUnique: (args: unknown) => Promise<{ id: string; userId: string; type: string; input: Prisma.JsonValue; status: string } | null>;
    update: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown>;
  };
  aiReviewItem: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
};

const AI_DAILY_COST_LIMIT_CENTS = Number(process.env.AI_DAILY_COST_LIMIT_CENTS ?? 500);
const AI_MAX_PROMPT_CHARS = Number(process.env.AI_MAX_PROMPT_CHARS ?? 12_000);

@Injectable()
export class AiService {
  private readonly aiDb: AiDb;

  constructor(private readonly prisma: PrismaService) {
    this.aiDb = prisma as unknown as AiDb;
  }

  async answerQuestion(statement: string, context: string) {
    const completion = await this.complete({
      userId: "system",
      feature: "question.answer",
      prompt: `Responda em pt-BR somente com base no contexto.\n\nContexto:\n${context}\n\nQuestao:\n${statement}`,
      skipUsageLog: true
    });
    return completion.text;
  }

  async smartSearch(user: AuthLikeUser, query: string, includeAi = false) {
    const q = query.trim();
    if (q.length < 2) throw new BadRequestException("Informe pelo menos 2 caracteres para buscar.");
    const [courses, lessons, questions, notes] = await Promise.all([
      this.prisma.course.findMany({
        where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
        select: { id: true, title: true, slug: true, description: true },
        take: 8
      }),
      this.prisma.lesson.findMany({
        where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] },
        include: { module: { include: { course: true } }, subject: true, topic: true },
        take: 8
      }),
      this.prisma.question.findMany({
        where: { OR: [{ statement: { contains: q, mode: "insensitive" } }, { explanation: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] },
        include: { subject: true, topic: true },
        take: 8
      }),
      this.prisma.note.findMany({
        where: { userId: user.id, OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] },
        take: 8,
        orderBy: { updatedAt: "desc" }
      })
    ]);
    const results = [
      ...courses.map((item) => ({ type: "course", id: item.id, title: item.title, excerpt: item.description, url: `/cursos/${item.slug}`, score: scoreText(q, `${item.title} ${item.description}`) })),
      ...lessons.map((item) => ({ type: "lesson", id: item.id, title: item.title, excerpt: item.description, url: `/aulas/${item.id}`, score: scoreText(q, `${item.title} ${item.description} ${item.subject.name} ${item.topic?.name ?? ""}`) })),
      ...questions.map((item) => ({ type: "question", id: item.id, title: item.code, excerpt: item.statement, url: `/questoes?code=${encodeURIComponent(item.code)}`, score: scoreText(q, `${item.code} ${item.statement} ${item.explanation ?? ""}`) })),
      ...notes.map((item) => ({ type: "note", id: item.id, title: item.title, excerpt: item.body, url: `/questoes`, score: scoreText(q, `${item.title} ${item.body}`) }))
    ].sort((a, b) => b.score - a.score);

    if (!includeAi) return { query: q, results };

    const context = results.slice(0, 8).map((item, index) => `${index + 1}. [${item.type}] ${item.title}: ${item.excerpt}`).join("\n");
    const answer = await this.completeAndLog(user.id, "search.synthesis", `Sintetize em pt-BR os melhores resultados para a busca "${q}". Use apenas o contexto.\n\n${context}`, { query: q });
    return { query: q, results, answer: answer.text };
  }

  async studySupport(user: AuthLikeUser, body: { question: string; lessonId?: string; questionId?: string }) {
    const question = body.question.trim();
    if (question.length < 5) throw new BadRequestException("Descreva melhor sua duvida.");
    const context = await this.contextFor(body.lessonId, body.questionId, user.id);
    const completion = await this.completeAndLog(
      user.id,
      "study.support",
      `Voce e um tutor de concursos. Responda em pt-BR, com passos curtos, sem inventar fatos fora do contexto.\n\nContexto:\n${context}\n\nDuvida:\n${question}`,
      { lessonId: body.lessonId, questionId: body.questionId }
    );
    return { answer: completion.text, usage: usageSummary(completion) };
  }

  async generateMaterial(user: AuthLikeUser, body: { lessonId: string; kind: "SUMMARY" | "FLASHCARDS" | "QUESTIONS"; instructions?: string }) {
    this.assertCanGenerate(user);
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: body.lessonId },
      include: { assets: true, module: { include: { course: true } }, subject: true, topic: true }
    });
    if (!lesson) throw new NotFoundException("Aula nao encontrada.");
    const transcript = transcriptFromAssets(lesson.assets);
    if (!transcript) throw new BadRequestException("Aula precisa de transcricao para gerar material.");
    const prompt = materialPrompt(body.kind, lesson.title, transcript, body.instructions);
    const completion = await this.completeAndLog(user.id, `material.${body.kind.toLowerCase()}`, prompt, { lessonId: lesson.id, kind: body.kind });
    const review = await this.aiDb.aiReviewItem.create({
      data: {
        userId: user.id,
        type: `material.${body.kind.toLowerCase()}`,
        entityType: "Lesson",
        entityId: lesson.id,
        status: "PENDING",
        content: { text: completion.text, lessonTitle: lesson.title, kind: body.kind }
      }
    });
    return { review, usage: usageSummary(completion) };
  }

  async organizeLessonTranscript(user: AuthLikeUser, body: { lessonId: string; transcript: string; saveAssets?: boolean }) {
    this.assertCanGenerate(user);
    const transcript = body.transcript.trim();
    if (transcript.length < 50) throw new BadRequestException("Transcricao muito curta.");
    const lesson = await this.prisma.lesson.findUnique({ where: { id: body.lessonId } });
    if (!lesson) throw new NotFoundException("Aula nao encontrada.");
    const completion = await this.completeAndLog(
      user.id,
      "lesson.organize-transcript",
      `Organize a transcricao abaixo em: resumo executivo, topicos, pontos de atencao e sugestao de materiais complementares. Responda em markdown pt-BR.\n\nAula: ${lesson.title}\n\nTranscricao:\n${transcript}`,
      { lessonId: lesson.id }
    );
    if (body.saveAssets) {
      await this.prisma.lessonAsset.createMany({
        data: [
          { lessonId: lesson.id, type: LessonAssetType.TRANSCRIPT, url: `inline://transcripts/${lesson.id}`, metadata: { body: transcript, generatedBy: user.id } },
          { lessonId: lesson.id, type: LessonAssetType.SUMMARY, url: `inline://summaries/${lesson.id}`, metadata: { body: completion.text, generatedBy: user.id, needsReview: true } }
        ]
      });
    }
    const review = await this.aiDb.aiReviewItem.create({
      data: {
        userId: user.id,
        type: "lesson.organized-transcript",
        entityType: "Lesson",
        entityId: lesson.id,
        status: "PENDING",
        content: { transcript, organized: completion.text }
      }
    });
    return { review, usage: usageSummary(completion) };
  }

  async createAutomationJob(user: AuthLikeUser, body: { type: "lesson.organize" | "material.summary"; input: Record<string, unknown> }) {
    this.assertCanGenerate(user);
    const job = await this.aiDb.aiAutomationJob.create({
      data: { userId: user.id, type: body.type, input: body.input as Prisma.InputJsonValue }
    });
    setTimeout(() => {
      void this.processAutomationJob(job.id).catch(() => undefined);
    }, 0);
    return job;
  }

  async processAutomationJob(jobId: string) {
    const job = await this.aiDb.aiAutomationJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Job de IA nao encontrado.");
    if (!["PENDING", "FAILED"].includes(job.status)) return job;
    await this.aiDb.aiAutomationJob.update({
      where: { id: job.id },
      data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 }, error: null }
    });
    try {
      const user = { id: job.userId, permissions: ["teacher:publish-lessons", "ai:generate-materials"] };
      const input = job.input as Record<string, unknown>;
      const result = job.type === "lesson.organize"
        ? await this.organizeLessonTranscript(user, { lessonId: String(input.lessonId), transcript: String(input.transcript), saveAssets: Boolean(input.saveAssets) })
        : await this.generateMaterial(user, { lessonId: String(input.lessonId), kind: "SUMMARY", instructions: String(input.instructions ?? "") });
      return this.aiDb.aiAutomationJob.update({
        where: { id: job.id },
        data: { status: "NEEDS_REVIEW", output: result as unknown as Prisma.InputJsonValue, completedAt: new Date() }
      });
    } catch (error) {
      return this.aiDb.aiAutomationJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: error instanceof Error ? error.message : "unknown" }
      });
    }
  }

  jobs(user: AuthLikeUser) {
    const canReview = hasPermission(user, "ai:review-materials") || hasPermission(user, "admin:manage-ai");
    return this.aiDb.aiAutomationJob.findMany({
      where: canReview ? {} : { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }

  reviews(user: AuthLikeUser) {
    this.assertCanReview(user);
    return this.aiDb.aiReviewItem.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 50 });
  }

  async reviewItem(user: AuthLikeUser, id: string, approved: boolean) {
    this.assertCanReview(user);
    return this.aiDb.aiReviewItem.update({
      where: { id },
      data: { status: approved ? "APPROVED" : "REJECTED", reviewedBy: user.id, reviewedAt: new Date() }
    });
  }

  usage(user: AuthLikeUser) {
    const canManage = hasPermission(user, "admin:manage-ai");
    return this.aiDb.aiUsageEvent.findMany({
      where: canManage ? {} : { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  private async completeAndLog(userId: string, feature: string, prompt: string, metadata?: Prisma.InputJsonValue) {
    await this.assertDailyLimit(userId);
    const completion = await this.complete({ userId, feature, prompt });
    await this.aiDb.aiUsageEvent.create({
      data: {
        userId,
        provider: completion.provider,
        model: completion.model,
        feature,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        costCents: completion.costCents,
        metadata
      }
    });
    return completion;
  }

  private async complete(input: { userId: string; feature: string; prompt: string; skipUsageLog?: boolean }): Promise<AiCompletion> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException("ANTHROPIC_API_KEY nao configurada.");
    if (input.prompt.length > AI_MAX_PROMPT_CHARS) throw new BadRequestException("Prompt excede o limite permitido.");
    const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [{ role: "user", content: input.prompt }]
      })
    });
    if (!response.ok) throw new ServiceUnavailableException("Falha ao consultar IA.");
    const payload = (await response.json()) as { content?: Array<{ text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
    const text = payload.content?.map((part) => part.text).filter(Boolean).join("\n") ?? "";
    const inputTokens = payload.usage?.input_tokens ?? estimateTokens(input.prompt);
    const outputTokens = payload.usage?.output_tokens ?? estimateTokens(text);
    return { text, provider: "anthropic", model, inputTokens, outputTokens, costCents: estimateCostCents(inputTokens, outputTokens) };
  }

  private async assertDailyLimit(userId: string) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const usage = await this.aiDb.aiUsageEvent.aggregate({ where: { userId, createdAt: { gte: since } }, _sum: { costCents: true } });
    if ((usage._sum.costCents ?? 0) >= AI_DAILY_COST_LIMIT_CENTS) throw new ForbiddenException("Limite diario de IA atingido.");
  }

  private async contextFor(lessonId: string | undefined, questionId: string | undefined, userId: string) {
    const parts: string[] = [];
    if (lessonId) {
      const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { assets: true, subject: true, topic: true } });
      if (lesson) parts.push(`Aula: ${lesson.title}\nMateria: ${lesson.subject.name}\nAssunto: ${lesson.topic?.name ?? "geral"}\n${transcriptFromAssets(lesson.assets) ?? lesson.description}`);
    }
    if (questionId) {
      const question = await this.prisma.question.findUnique({ where: { id: questionId }, include: { subject: true, topic: true } });
      if (question) parts.push(`Questao ${question.code}: ${question.statement}\nExplicacao: ${question.explanation ?? "sem explicacao"}`);
    }
    const notes = await this.prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 5 });
    if (notes.length) parts.push(`Notas recentes:\n${notes.map((note) => `${note.title}: ${note.body}`).join("\n")}`);
    return parts.join("\n\n").slice(0, AI_MAX_PROMPT_CHARS);
  }

  private assertCanGenerate(user: AuthLikeUser) {
    if (hasPermission(user, "ai:generate-materials") || hasPermission(user, "teacher:publish-lessons") || hasPermission(user, "admin:manage-ai")) return;
    throw new ForbiddenException("Sem permissao para gerar materiais com IA.");
  }

  private assertCanReview(user: AuthLikeUser) {
    if (hasPermission(user, "ai:review-materials") || hasPermission(user, "admin:manage-ai")) return;
    throw new ForbiddenException("Sem permissao para revisar conteudo de IA.");
  }
}

function hasPermission(user: AuthLikeUser, permission: string) {
  return Boolean(user.permissions?.includes(permission));
}

function transcriptFromAssets(assets: Array<{ type: LessonAssetType; metadata?: Prisma.JsonValue | null }>) {
  const asset = assets.find((item) => item.type === LessonAssetType.TRANSCRIPT && item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) && "body" in item.metadata);
  if (!asset?.metadata || typeof asset.metadata !== "object" || Array.isArray(asset.metadata)) return "";
  return String(asset.metadata.body ?? "");
}

function materialPrompt(kind: "SUMMARY" | "FLASHCARDS" | "QUESTIONS", lessonTitle: string, transcript: string, instructions?: string) {
  const base = `Use a transcricao da aula "${lessonTitle}" e gere conteudo em pt-BR. Nao invente informacoes fora da transcricao.`;
  if (kind === "FLASHCARDS") return `${base}\nFormato: lista JSON com frente e verso.\nInstrucoes: ${instructions ?? "padrao"}\n\n${transcript}`;
  if (kind === "QUESTIONS") return `${base}\nFormato: questoes objetivas com gabarito e explicacao.\nInstrucoes: ${instructions ?? "padrao"}\n\n${transcript}`;
  return `${base}\nFormato: markdown com resumo, topicos, alertas de prova e checklist.\nInstrucoes: ${instructions ?? "padrao"}\n\n${transcript}`;
}

function scoreText(query: string, text: string) {
  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  if (normalizedText.includes(normalizedQuery)) return 100 + normalizedQuery.length;
  return normalizedQuery.split(/\s+/).filter((part) => normalizedText.includes(part)).length * 10;
}

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function estimateCostCents(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * 300;
  const outputCost = (outputTokens / 1_000_000) * 1500;
  return Math.max(1, Math.ceil(inputCost + outputCost));
}

function usageSummary(completion: AiCompletion) {
  return {
    provider: completion.provider,
    model: completion.model,
    inputTokens: completion.inputTokens,
    outputTokens: completion.outputTokens,
    costCents: completion.costCents
  };
}
