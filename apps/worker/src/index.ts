import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@foxtrot/database";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});
const prisma = new PrismaClient();

export const mediaQueue = new Queue("media", { connection });
export const rankingQueue = new Queue("ranking", { connection });
export const notificationQueue = new Queue("notifications", { connection });

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
      const period = (job.data as { period?: string }).period ?? "daily";
      const grouped = await prisma.xpEvent.groupBy({
        by: ["userId"],
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
    await prisma.auditLog.create({
      data: {
        actorId: job.data.actorId,
        action: `notification.${job.name}`,
        entityType: "Notification",
        metadata: job.data
      }
    });
  },
  { connection }
);

console.log("Foxtrot workers online: media, ranking, notifications.");
