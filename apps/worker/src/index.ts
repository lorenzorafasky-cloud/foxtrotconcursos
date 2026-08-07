import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { ChallengeStatus, LessonAssetType, NotificationType, PrismaClient } from "@foxtrot/database";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});
const prisma = new PrismaClient();
const aiDb = prisma as unknown as {
  aiAutomationJob: {
    findMany: (args: unknown) => Promise<Array<{ id: string }>>;
    findUnique: (args: unknown) => Promise<{ id: string; userId: string; type: string; input: unknown; status: string } | null>;
    update: (args: unknown) => Promise<unknown>;
  };
  aiReviewItem: { create: (args: unknown) => Promise<{ id: string }> };
  aiUsageEvent: { create: (args: unknown) => Promise<unknown> };
};

export const mediaQueue = new Queue("media", { connection });
export const rankingQueue = new Queue("ranking", { connection });
export const notificationQueue = new Queue("notifications", { connection });
export const aiQueue = new Queue("ai", { connection });

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
    }
  },
  { connection }
);

new Worker(
  "notifications",
  async (job) => {
    if (job.name === "create") {
      const data = job.data as { userId: string; type?: NotificationType; title: string; body: string; actionUrl?: string; metadata?: object };
      await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type ?? NotificationType.SYSTEM,
          title: data.title,
          body: data.body,
          actionUrl: data.actionUrl,
          metadata: data.metadata
        }
      });
    }
    if (job.name === "challenge-expired") {
      await prisma.challenge.updateMany({
        where: { status: ChallengeStatus.ACTIVE, endsAt: { lt: new Date() } },
        data: { status: ChallengeStatus.FINISHED }
      });
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
