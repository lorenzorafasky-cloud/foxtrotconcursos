import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue } from "bullmq";

/**
 * Produtor BullMQ da API (consumidores vivem em apps/worker).
 * Degradacao graciosa: sem REDIS_URL o enfileiramento e apenas logado —
 * o worker possui varreduras periodicas que reprocessam pendencias.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();

  async enqueue(queueName: "media" | "ranking" | "notifications" | "ai", jobName: string, data: Record<string, unknown>) {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn(`REDIS_URL ausente; job ${queueName}/${jobName} nao enfileirado.`);
      return { enqueued: false as const };
    }
    try {
      let queue = this.queues.get(queueName);
      if (!queue) {
        queue = new Queue(queueName, { connection: { url } });
        this.queues.set(queueName, queue);
      }
      const job = await queue.add(jobName, data, {
        removeOnComplete: 500,
        removeOnFail: 1000,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 }
      });
      return { enqueued: true as const, jobId: job.id };
    } catch (error) {
      this.logger.warn(`Falha ao enfileirar ${queueName}/${jobName}: ${error instanceof Error ? error.message : String(error)}`);
      return { enqueued: false as const };
    }
  }

  async onModuleDestroy() {
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close().catch(() => undefined)));
    this.queues.clear();
  }
}
