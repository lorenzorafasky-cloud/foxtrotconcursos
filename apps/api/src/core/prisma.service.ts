import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@foxtrot/database";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    if (process.env.SKIP_PRISMA_CONNECT === "true") return;
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
