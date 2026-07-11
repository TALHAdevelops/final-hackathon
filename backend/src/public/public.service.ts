import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Serves the public, QR-accessible asset view. Exposes only safe fields —
 * never technician notes, costs, internal attachments, or user details.
 */
@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssetByPublicId(publicId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { publicId },
      select: {
        publicId: true,
        code: true,
        name: true,
        category: true,
        location: true,
        condition: true,
        status: true,
        lastServiceDate: true,
        nextServiceDate: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Safe recent activity — action + date only, no internal detail or actor.
    const history = await this.prisma.assetHistory.findMany({
      where: { asset: { publicId } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { action: true, createdAt: true },
    });

    return {
      ...asset,
      isRetired: asset.status === 'RETIRED',
      recentActivity: history,
      canReportIssue: asset.status !== 'RETIRED',
    };
  }
}
