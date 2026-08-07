import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import IORedis, { Redis } from "ioredis";

/**
 * Cliente Redis compartilhado (Upstash/local) com degradacao graciosa:
 * se REDIS_URL nao estiver configurado ou a conexao falhar, os chamadores
 * recebem `null` e devem usar o fallback em Postgres.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private failedAt: number | null = null;
  private static readonly RETRY_AFTER_MS = 30_000;

  getClient(): Redis | null {
    if (this.client) return this.client;
    if (this.failedAt && Date.now() - this.failedAt < RedisService.RETRY_AFTER_MS) return null;

    const url = process.env.REDIS_URL;
    if (!url) return null;

    try {
      const client = new IORedis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: false,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2_000))
      });
      client.on("error", (error) => {
        this.logger.warn(`Redis indisponivel: ${error.message}`);
      });
      client.on("end", () => {
        this.client = null;
        this.failedAt = Date.now();
      });
      this.client = client;
      return client;
    } catch (error) {
      this.failedAt = Date.now();
      this.logger.warn(`Falha ao criar cliente Redis: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => this.client?.disconnect());
      this.client = null;
    }
  }
}
