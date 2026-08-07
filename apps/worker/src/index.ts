import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { ChallengeStatus, LessonAssetType, NotificationType, Prisma, PrismaClient } from "@foxtrot/database";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});
const prisma = new PrismaClient();
const aiDb = prisma as unknown as {
  aiAutomationJob: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>;
    findUnique: (args: unknown) => Promise<{ id: string; userId: string; type: string; input: unknown; status: string } | null>;
    update: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<{ id: string }>;
  };
  aiReviewItem: { create: (args: unknown) => Promise<{ id: string }> };
  aiUsageEvent: { create: (args: unknown) => Promise<unknown> };
};

export const mediaQueue = new Queue("media", { connection });
export const rankingQueue = new Queue("ranking", { connection });
export const notificationQueue = new Queue("notifications", { connection });
export const aiQueue = new Queue("ai", { connection });

/**
 * Agendamento dos jobs recorrentes (Secao 11: reset/snapshot diario e semanal).
 * Sem isto os handlers existiam mas nunca disparavam.
 */
void (async () => {
  try {
    await rankingQueue.upsertJobScheduler("ranking-daily", { pattern: "5 0 * * *" }, { name: "snapshot", data: { period: "daily" } });
    await rankingQueue.upsertJobScheduler("ranking-weekly", { pattern: "10 0 * * 1" }, { name: "snapshot", data: { period: "weekly" } });
    await notificationQueue.upsertJobScheduler("challenges-expire", { pattern: "15 0 * * *" }, { name: "challenge-expired", data: {} });
    await notificationQueue.upsertJobScheduler("streak-guard", { pattern: "30 0 * * *" }, { name: "streak-guard", data: {} });
    await aiQueue.upsertJobScheduler("ai-pending-sweep", { pattern: "*/10 * * * *" }, { name: "process-pending", data: {} });
  } catch (error) {
    console.warn("Falha ao agendar jobs recorrentes:", error instanceof Error ? error.message : error);
  }
})();

new Worker(
  "media",
  async (job) => {
    if (job.name === "lesson-uploaded") {
      const { lessonId, videoUrl } = job.data as { lessonId: string; videoUrl: string };
      await prisma.lessonAsset.create({
        data: {
          lessonId,
          type: "VIDEO",
          url: videoUrl,
          metadata: { processedAt: new Date().toISOString() }
        }
      });
      await prisma.lessonAsset.create({
        data: {
          lessonId,
          type: "THUMBNAIL",
          url: `r2://foxtrot-assets/thumbnails/${lessonId}.jpg`,
          metadata: { source: "cloudflare-stream" }
        }
      });
    }
    if (job.name === "transcribe") {
      const { lessonId, videoUid } = job.data as { lessonId: string; videoUid: string };
      await transcribeLesson(lessonId, videoUid);
    }
  },
  { connection }
);

new Worker(
  "ranking",
  async (job) => {
    if (job.name === "snapshot") {
      const period = (job.data as { period?: "daily" | "weekly" | "all" }).period ?? "daily";
      const since = periodStart(period);
      const grouped = await prisma.xpEvent.groupBy({
        by: ["userId"],
        where: {
          revokedAt: null,
          ...(since ? { createdAt: { gte: since } } : {})
        },
        _sum: { points: true },
        orderBy: { _sum: { points: "desc" } },
        take: 100
      });
      await prisma.leaderboardSnapshot.create({
        data: {
          scope: "global",
          period,
          entries: grouped.map((entry, index) => ({
            position: index + 1,
            userId: entry.userId,
            xp: entry._sum.points ?? 0
          }))
        }
      });
      // Reidrata os Sorted Sets do Redis (fonte primaria dos leaderboards em tempo real).
      await hydrateLeaderboardZset("global", period, grouped.map((entry) => ({ userId: entry.userId, xp: entry._sum.points ?? 0 })));
    }
  },
  { connection }
);

new Worker(
  "notifications",
  async (job) => {
    if (job.name === "create") {
      const data = job.data as { userId: string; type?: NotificationType; title: string; body: string; actionUrl?: string; metadata?: object };
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type ?? NotificationType.SYSTEM,
          title: data.title,
          body: data.body,
          actionUrl: data.actionUrl,
          metadata: data.metadata
        }
      });
      await sendNotificationEmail(notification.userId, data.title, data.body, data.actionUrl);
    }
    if (job.name === "challenge-expired") {
      await prisma.challenge.updateMany({
        where: { status: ChallengeStatus.ACTIVE, endsAt: { lt: new Date() } },
        data: { status: ChallengeStatus.FINISHED }
      });
    }
    if (job.name === "streak-guard") {
      await runStreakGuard();
    }
  },
  { connection }
);

new Worker(
  "ai",
  async (job) => {
    if (job.name === "process-pending") {
      const pending = await aiDb.aiAutomationJob.findMany({ where: { status: "PENDING" }, take: 10, orderBy: { createdAt: "asc" } });
      for (const item of pending) await processAiJob(item.id);
    }
    if (job.name === "process-job") {
      const data = job.data as { jobId: string };
      await processAiJob(data.jobId);
    }
  },
  { connection }
);

console.log("Foxtrot workers online: media, ranking, notifications, ai.");

function periodStart(period: "daily" | "weekly" | "all") {
  if (period === "all") return null;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (period === "weekly") date.setDate(date.getDate() - 6);
  return date;
}

async function processAiJob(jobId: string) {
  const job = await aiDb.aiAutomationJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "PENDING") return;
  await aiDb.aiAutomationJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 }, error: null }
  });
  try {
    const input = job.input as Record<string, unknown>;
    const lessonId = String(input.lessonId ?? "");
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { assets: true } });
    if (!lesson) throw new Error("Aula nao encontrada.");
    const transcript = String(input.transcript ?? transcriptFromAssets(lesson.assets));
    if (transcript.trim().length < 50) throw new Error("Transcricao ausente ou muito curta.");
    const prompt = job.type === "lesson.organize"
      ? `Organize a transcricao em resumo, topicos e pontos de prova.\n\n${transcript}`
      : `Gere um resumo em markdown, fiel a transcricao.\n\n${transcript}`;
    const completion = await callAnthropic(prompt);
    if (Boolean(input.saveAssets)) {
      await prisma.lessonAsset.create({
        data: {
          lessonId: lesson.id,
          type: LessonAssetType.SUMMARY,
          url: `inline://ai-summary/${lesson.id}/${job.id}`,
          metadata: { body: completion.text, generatedByJob: job.id, needsReview: true }
        }
      });
    }
    const review = await aiDb.aiReviewItem.create({
      data: {
        userId: job.userId,
        type: job.type,
        entityType: "Lesson",
        entityId: lesson.id,
        status: "PENDING",
        content: { text: completion.text, jobId: job.id }
      }
    });
    await aiDb.aiUsageEvent.create({
      data: {
        userId: job.userId,
        provider: "anthropic",
        model: completion.model,
        feature: job.type,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        costCents: completion.costCents,
        metadata: { jobId: job.id }
      }
    });
    await aiDb.aiAutomationJob.update({
      where: { id: job.id },
      data: { status: "NEEDS_REVIEW", output: { reviewId: review.id }, completedAt: new Date() }
    });
  } catch (error) {
    await aiDb.aiAutomationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message : "unknown" }
    });
  }
}

async function callAnthropic(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY nao configurada.");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({ model, max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
  });
  if (!response.ok) throw new Error("Falha ao consultar IA.");
  const payload = await response.json() as { content?: Array<{ text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
  const text = payload.content?.map((part) => part.text).filter(Boolean).join("\n") ?? "";
  const inputTokens = payload.usage?.input_tokens ?? Math.ceil(prompt.length / 4);
  const outputTokens = payload.usage?.output_tokens ?? Math.ceil(text.length / 4);
  return { text, model, inputTokens, outputTokens, costCents: Math.max(1, Math.ceil((inputTokens / 1_000_000) * 300 + (outputTokens / 1_000_000) * 1500)) };
}

function transcriptFromAssets(assets: Array<{ type: LessonAssetType; metadata: unknown }>) {
  const transcript = assets.find((asset) => asset.type === LessonAssetType.TRANSCRIPT && asset.metadata && typeof asset.metadata === "object" && "body" in asset.metadata);
  return transcript?.metadata && typeof transcript.metadata === "object" && "body" in transcript.metadata ? String(transcript.metadata.body) : "";
}

/**
 * Reidrata um leaderboard em Redis Sorted Set (mesma convencao de chaves do
 * LeaderboardService da API): lb:{scope}:{d:{dia}|w:{segunda}|all}.
 */
async function hydrateLeaderboardZset(scope: string, period: "daily" | "weekly" | "all", entries: Array<{ userId: string; xp: number }>) {
  if (!entries.length) return;
  const key = leaderboardKey(scope, period);
  const pipeline = connection.pipeline();
  pipeline.del(key);
  pipeline.zadd(key, ...entries.flatMap((entry) => [entry.xp, entry.userId]));
  if (period === "daily") pipeline.expire(key, 3 * 24 * 60 * 60);
  if (period === "weekly") pipeline.expire(key, 15 * 24 * 60 * 60);
  await pipeline.exec();
}

function leaderboardKey(scope: string, period: "daily" | "weekly" | "all", reference = new Date()) {
  if (period === "all") return `lb:${scope}:all`;
  if (period === "daily") return `lb:${scope}:d:${reference.toISOString().slice(0, 10)}`;
  const monday = new Date(reference);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return `lb:${scope}:w:${monday.toISOString().slice(0, 10)}`;
}

/**
 * Transcricao real da videoaula (Secao 7 do Prompt Mestre):
 * Stream download -> Workers AI (Whisper) -> asset TRANSCRIPT ->
 * job de resumo por IA com revisao humana.
 */
async function transcribeLesson(lessonId: string, videoUid: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { assets: true } });
  if (!lesson) throw new Error("Aula nao encontrada para transcricao.");

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    await upsertLessonAssetMetadata(lessonId, LessonAssetType.VIDEO, { transcription: "pending-credentials" });
    console.warn(`Transcricao adiada para aula ${lessonId}: credenciais Cloudflare ausentes.`);
    return;
  }

  const downloadUrl = await ensureStreamDownload(accountId, apiToken, videoUid);
  const media = await fetch(downloadUrl);
  if (!media.ok) throw new Error(`Falha ao baixar video ${videoUid} para transcricao.`);
  const audioBuffer = Buffer.from(await media.arrayBuffer());

  const aiResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/openai/whisper-large-v3-turbo`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify({ audio: audioBuffer.toString("base64"), language: "pt" })
    }
  );
  if (!aiResponse.ok) throw new Error(`Workers AI recusou a transcricao do video ${videoUid}.`);
  const aiPayload = (await aiResponse.json()) as {
    success?: boolean;
    result?: { text?: string; segments?: Array<{ start: number; end: number; text: string }> };
  };
  const text = aiPayload.result?.text?.trim();
  if (!text) throw new Error(`Transcricao vazia para o video ${videoUid}.`);

  const existing = lesson.assets.find((asset) => asset.type === LessonAssetType.TRANSCRIPT);
  const metadata = {
    body: text,
    segments: aiPayload.result?.segments ?? [],
    source: "cloudflare-workers-ai/whisper-large-v3-turbo",
    videoUid,
    transcribedAt: new Date().toISOString()
  };
  if (existing) {
    await prisma.lessonAsset.update({ where: { id: existing.id }, data: { metadata } });
  } else {
    await prisma.lessonAsset.create({
      data: { lessonId, type: LessonAssetType.TRANSCRIPT, url: `inline://transcripts/${lessonId}`, metadata }
    });
  }

  // Indexacao RAG: chunking + embeddings por aula (pgvector).
  await indexLessonChunks(lessonId, text).catch((error) => {
    console.warn(`Indexacao RAG falhou para aula ${lessonId}:`, error instanceof Error ? error.message : error);
  });

  const ownerId = lesson.teacherId ?? (await firstAdminId());
  if (ownerId) {
    const summaryJob = await aiDb.aiAutomationJob.create({
      data: {
        userId: ownerId,
        type: "lesson.summary",
        status: "PENDING",
        input: { lessonId, transcript: text, saveAssets: true }
      }
    });
    await aiQueue.add("process-job", { jobId: summaryJob.id });
  }
}

/**
 * Fatia a transcricao em chunks (~1200 chars com overlap) e grava embeddings
 * (Workers AI bge-m3, 1024 dims — mesmo modelo consultado pela API no RAG).
 */
async function indexLessonChunks(lessonId: string, transcript: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return;

  const chunks = chunkText(transcript, 1200, 200);
  if (!chunks.length) return;

  await prisma.lessonChunk.deleteMany({ where: { lessonId } });
  for (let position = 0; position < chunks.length; position += 1) {
    const content = chunks[position];
    if (!content) continue;
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/baai/bge-m3`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify({ text: [content.slice(0, 2000)] })
    });
    if (!response.ok) throw new Error(`Embedding falhou no chunk ${position}.`);
    const payload = (await response.json()) as { result?: { data?: number[][] } };
    const embedding = payload.result?.data?.[0];
    if (!embedding) throw new Error(`Embedding vazio no chunk ${position}.`);
    await prisma.$executeRaw`
      INSERT INTO "LessonChunk" ("id", "lessonId", "position", "content", "embedding")
      VALUES (${`${lessonId}-${position}`}, ${lessonId}, ${position}, ${content}, ${`[${embedding.join(",")}]`}::vector)
      ON CONFLICT ("lessonId", "position") DO UPDATE SET "content" = EXCLUDED."content", "embedding" = EXCLUDED."embedding"
    `;
  }
}

function chunkText(text: string, size: number, overlap: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [] as string[];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    chunks.push(clean.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

/**
 * Streak freeze (Secao 17): se o usuario nao estudou ontem mas vinha em
 * ofensiva e tem congelamentos disponiveis, consome um e marca o dia como
 * coberto, notificando o aluno.
 */
async function runStreakGuard() {
  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(yesterday);
  dayBefore.setDate(dayBefore.getDate() - 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates = await prisma.user.findMany({
    where: { streakFreezes: { gt: 0 } },
    select: { id: true, streakFreezes: true }
  });

  for (const user of candidates) {
    const [activeYesterday, activeDayBefore, alreadyCovered] = await Promise.all([
      hadActivity(user.id, yesterday, today),
      hadActivity(user.id, dayBefore, yesterday),
      prisma.streakFreezeUse.findUnique({ where: { userId_date: { userId: user.id, date: yesterday } } })
    ]);
    if (activeYesterday || !activeDayBefore || alreadyCovered) continue;

    await prisma.$transaction([
      prisma.streakFreezeUse.create({ data: { userId: user.id, date: yesterday } }),
      prisma.user.update({ where: { id: user.id }, data: { streakFreezes: { decrement: 1 } } })
    ]);
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.SYSTEM,
        title: "Ofensiva protegida",
        body: "Voce nao estudou ontem, mas um congelamento de ofensiva foi usado automaticamente. Sua sequencia continua viva.",
        actionUrl: "/gamificacao"
      }
    });
  }
}

async function hadActivity(userId: string, from: Date, to: Date) {
  const [focus, attempts] = await Promise.all([
    prisma.focusSession.count({ where: { userId, startedAt: { gte: from, lt: to }, netSeconds: { gt: 0 } } }),
    prisma.questionAttempt.count({ where: { userId, createdAt: { gte: from, lt: to } } })
  ]);
  return focus > 0 || attempts > 0;
}

/** E-mail transacional de notificacao via Resend (silencioso sem API key). */
async function sendNotificationEmail(userId: string, title: string, body: string, actionUrl?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, nickname: true } });
  if (!user) return;
  const appUrl = process.env.APP_URL ?? "http://localhost:3100";
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "Foxtrot Concursos <contato@foxtrotconcursos.com.br>",
        to: user.email,
        subject: `[Foxtrot] ${title}`,
        text: `${body}${actionUrl ? `\n\nAcesse: ${appUrl}${actionUrl}` : ""}`
      })
    });
  } catch (error) {
    console.warn("Falha ao enviar e-mail de notificacao:", error instanceof Error ? error.message : error);
  }
}

async function ensureStreamDownload(accountId: string, apiToken: string, videoUid: string) {
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoUid}/downloads`;
  const headers = { authorization: `Bearer ${apiToken}`, "content-type": "application/json" };
  const created = await fetch(base, { method: "POST", headers });
  if (!created.ok && created.status !== 409) {
    throw new Error(`Falha ao habilitar download do video ${videoUid}.`);
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await fetch(base, { headers });
    if (status.ok) {
      const payload = (await status.json()) as {
        result?: { default?: { url?: string; status?: string; percentComplete?: number } };
      };
      const item = payload.result?.default;
      if (item?.url && (item.status === "ready" || item.percentComplete === 100)) return item.url;
    }
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error(`Download do video ${videoUid} nao ficou pronto a tempo.`);
}

async function firstAdminId() {
  const admin = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: "ADMIN_MASTER" } } } },
    select: { id: true }
  });
  return admin?.id ?? null;
}

async function upsertLessonAssetMetadata(lessonId: string, type: LessonAssetType, patch: Record<string, unknown>) {
  const asset = await prisma.lessonAsset.findFirst({ where: { lessonId, type } });
  if (!asset) return;
  const current = asset.metadata && typeof asset.metadata === "object" ? (asset.metadata as Record<string, unknown>) : {};
  await prisma.lessonAsset.update({
    where: { id: asset.id },
    data: { metadata: { ...current, ...patch } as Prisma.InputJsonValue }
  });
}
