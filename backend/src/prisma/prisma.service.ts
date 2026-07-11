import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // Attempt an eager connection, but don't crash the app if the database is
    // briefly unreachable (e.g. a serverless Postgres cold-start). Prisma
    // connects lazily on the first query regardless.
    try {
      await this.$connect();
    } catch (err) {
      this.logger.warn(
        `Initial DB connect failed, will retry lazily: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
