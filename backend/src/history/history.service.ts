import { Injectable } from '@nestjs/common';
import { HistoryAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordHistoryInput {
  assetId: string;
  action: HistoryAction;
  actorId?: string | null;
  detail?: Prisma.InputJsonValue;
  relatedIssueId?: string | null;
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append a single history event. History is append-only — this service
   * intentionally exposes no update or delete methods.
   * Accepts an optional transaction client so callers can record history
   * atomically alongside the change that triggered it.
   */
  record(
    input: RecordHistoryInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.assetHistory.create({
      data: {
        assetId: input.assetId,
        action: input.action,
        actorId: input.actorId ?? null,
        detail: input.detail,
        relatedIssueId: input.relatedIssueId ?? null,
      },
    });
  }

  findByAsset(assetId: string) {
    return this.prisma.assetHistory.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
