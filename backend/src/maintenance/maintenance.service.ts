import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';

@Injectable()
export class MaintenanceService {
  /**
   * Create a maintenance record for an issue. Runs inside the caller's
   * transaction so it stays atomic with the issue status change.
   */
  create(
    tx: Prisma.TransactionClient,
    issueId: string,
    technicianId: string,
    dto: CreateMaintenanceDto,
  ) {
    if (dto.cost !== undefined && dto.cost < 0) {
      throw new BadRequestException('Maintenance cost cannot be negative');
    }

    return tx.maintenanceRecord.create({
      data: {
        issueId,
        technicianId,
        notes: dto.notes,
        partsReplaced: dto.partsReplaced
          ? { items: dto.partsReplaced }
          : undefined,
        cost: dto.cost !== undefined ? new Prisma.Decimal(dto.cost) : undefined,
        timeSpent: dto.timeSpent,
        finalCondition: dto.finalCondition,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
      },
    });
  }

  countForIssue(issueId: string, prisma: Prisma.TransactionClient) {
    return prisma.maintenanceRecord.count({ where: { issueId } });
  }
}
