import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus, HistoryAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async create(dto: CreateAssetDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const code = dto.code?.trim()
        ? dto.code.trim()
        : await this.generateCode(tx);

      const existing = await tx.asset.findUnique({ where: { code } });
      if (existing) {
        throw new ConflictException(`Asset code "${code}" already exists`);
      }

      const asset = await tx.asset.create({
        data: {
          code,
          name: dto.name,
          category: dto.category,
          location: dto.location,
          condition: dto.condition,
          description: dto.description,
          lastServiceDate: dto.lastServiceDate
            ? new Date(dto.lastServiceDate)
            : undefined,
          nextServiceDate: dto.nextServiceDate
            ? new Date(dto.nextServiceDate)
            : undefined,
        },
      });

      await this.history.record(
        {
          assetId: asset.id,
          action: HistoryAction.ASSET_CREATED,
          actorId,
          detail: { code: asset.code, name: asset.name },
        },
        tx,
      );

      return asset;
    });
  }

  async findAll(query: QueryAssetsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.AssetWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.category)
      where.category = { equals: query.category, mode: 'insensitive' };
    if (query.location)
      where.location = { contains: query.location, mode: 'insensitive' };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        issues: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  /** Public lookup by the stable publicId encoded in the QR / public URL. */
  async findByPublicId(publicId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { publicId } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto, actorId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');

    if (dto.code && dto.code.trim() !== asset.code) {
      const clash = await this.prisma.asset.findUnique({
        where: { code: dto.code.trim() },
      });
      if (clash) {
        throw new ConflictException(
          `Asset code "${dto.code.trim()}" already exists`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const statusChanged =
        dto.status !== undefined && dto.status !== asset.status;

      const updated = await tx.asset.update({
        where: { id },
        data: {
          name: dto.name,
          category: dto.category,
          location: dto.location,
          condition: dto.condition,
          description: dto.description,
          code: dto.code?.trim(),
          status: dto.status,
          lastServiceDate: dto.lastServiceDate
            ? new Date(dto.lastServiceDate)
            : undefined,
          nextServiceDate: dto.nextServiceDate
            ? new Date(dto.nextServiceDate)
            : undefined,
        },
      });

      await this.history.record(
        {
          assetId: id,
          action: statusChanged
            ? HistoryAction.STATUS_CHANGED
            : HistoryAction.ASSET_UPDATED,
          actorId,
          detail: statusChanged
            ? { from: asset.status, to: dto.status }
            : { updatedFields: Object.keys(dto) },
        },
        tx,
      );

      return updated;
    });
  }

  async retire(id: string, actorId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status === AssetStatus.RETIRED) {
      throw new ConflictException('Asset is already retired');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id },
        data: { status: AssetStatus.RETIRED },
      });
      await this.history.record(
        {
          assetId: id,
          action: HistoryAction.ASSET_RETIRED,
          actorId,
          detail: { previousStatus: asset.status },
        },
        tx,
      );
      return updated;
    });
  }

  /**
   * Generate the next sequential asset code (AST-0001, AST-0002, ...).
   * Runs inside the create transaction; the unique constraint on `code`
   * is the ultimate guard against a race.
   */
  private async generateCode(tx: Prisma.TransactionClient): Promise<string> {
    const last = await tx.asset.findFirst({
      where: { code: { startsWith: 'AST-' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    const lastNum = last ? parseInt(last.code.replace('AST-', ''), 10) : 0;
    const next = Number.isNaN(lastNum) ? 1 : lastNum + 1;
    return `AST-${String(next).padStart(4, '0')}`;
  }
}
