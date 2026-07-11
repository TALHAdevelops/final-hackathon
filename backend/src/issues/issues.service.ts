import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetStatus,
  HistoryAction,
  Issue,
  IssuePriority,
  IssueStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { CreateMaintenanceDto } from '../maintenance/dto/create-maintenance.dto';
import { CreateIssueDto } from './dto/create-issue.dto';
import { QueryIssuesDto } from './dto/query-issues.dto';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import {
  assetStatusForIssue,
  canTransition,
  DEDICATED_TRANSITIONS,
} from './issue-workflow';

// Statuses that count as "still open" for asset-status recalculation.
const OPEN_ISSUE_STATUSES: IssueStatus[] = [
  IssueStatus.REPORTED,
  IssueStatus.ASSIGNED,
  IssueStatus.INSPECTION_STARTED,
  IssueStatus.MAINTENANCE_IN_PROGRESS,
  IssueStatus.WAITING_FOR_PARTS,
  IssueStatus.REOPENED,
];

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
    private readonly maintenance: MaintenanceService,
  ) {}

  private assertCanModify(issue: Issue, user: AuthUser): void {
    const privileged =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR;
    if (privileged) return;
    if (
      user.role === UserRole.TECHNICIAN &&
      issue.assignedTechnicianId === user.id
    ) {
      return;
    }
    throw new ForbiddenException(
      'You can only modify issues assigned to you',
    );
  }

  private async getIssueOrThrow(id: string): Promise<Issue> {
    const issue = await this.prisma.issue.findUnique({ where: { id } });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  /** Assign (or reassign) an issue to a technician. Admin/Supervisor only. */
  async assign(id: string, technicianId: string, actor: AuthUser) {
    const issue = await this.getIssueOrThrow(id);
    const assignable: IssueStatus[] = [
      IssueStatus.REPORTED,
      IssueStatus.ASSIGNED,
      IssueStatus.REOPENED,
    ];
    if (!assignable.includes(issue.status)) {
      throw new ConflictException(
        `Cannot assign an issue in status ${issue.status}`,
      );
    }

    const tech = await this.prisma.user.findUnique({
      where: { id: technicianId },
    });
    if (!tech || tech.role !== UserRole.TECHNICIAN) {
      throw new BadRequestException('Target user is not a technician');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.issue.update({
        where: { id },
        data: {
          assignedTechnicianId: technicianId,
          status: IssueStatus.ASSIGNED,
        },
      });
      await this.history.record(
        {
          assetId: issue.assetId,
          action: HistoryAction.ISSUE_ASSIGNED,
          actorId: actor.id,
          detail: { issueNumber: issue.number, technicianId },
          relatedIssueId: issue.id,
        },
        tx,
      );
      return updated;
    });
  }

  /** Generic status transition (inspection start, waiting for parts, etc). */
  async transition(id: string, to: IssueStatus, user: AuthUser) {
    const issue = await this.getIssueOrThrow(id);
    this.assertCanModify(issue, user);

    if (DEDICATED_TRANSITIONS.includes(to)) {
      throw new BadRequestException(
        `Use the dedicated endpoint to move an issue to ${to}`,
      );
    }
    if (!canTransition(issue.status, to)) {
      throw new ConflictException(
        `Invalid transition ${issue.status} -> ${to}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.issue.update({
        where: { id },
        data: { status: to },
      });
      const assetStatus = assetStatusForIssue(to);
      if (assetStatus) {
        await tx.asset.update({
          where: { id: issue.assetId },
          data: { status: assetStatus },
        });
      }
      await this.history.record(
        {
          assetId: issue.assetId,
          action: HistoryAction.STATUS_CHANGED,
          actorId: user.id,
          detail: { issueNumber: issue.number, from: issue.status, to },
          relatedIssueId: issue.id,
        },
        tx,
      );
      return updated;
    });
  }

  /** Record maintenance work; moves issue into MAINTENANCE_IN_PROGRESS. */
  async addMaintenance(id: string, dto: CreateMaintenanceDto, user: AuthUser) {
    const issue = await this.getIssueOrThrow(id);
    this.assertCanModify(issue, user);

    const maintainable: IssueStatus[] = [
      IssueStatus.INSPECTION_STARTED,
      IssueStatus.MAINTENANCE_IN_PROGRESS,
      IssueStatus.WAITING_FOR_PARTS,
    ];
    if (!maintainable.includes(issue.status)) {
      throw new ConflictException(
        `Cannot record maintenance while issue is ${issue.status}. Start inspection first.`,
      );
    }

    const technicianId = issue.assignedTechnicianId ?? user.id;

    return this.prisma.$transaction(async (tx) => {
      const record = await this.maintenance.create(
        tx,
        id,
        technicianId,
        dto,
      );
      if (issue.status !== IssueStatus.MAINTENANCE_IN_PROGRESS) {
        await tx.issue.update({
          where: { id },
          data: { status: IssueStatus.MAINTENANCE_IN_PROGRESS },
        });
      }
      await tx.asset.update({
        where: { id: issue.assetId },
        data: { status: AssetStatus.UNDER_MAINTENANCE },
      });
      await this.history.record(
        {
          assetId: issue.assetId,
          action: HistoryAction.MAINTENANCE_RECORDED,
          actorId: user.id,
          detail: {
            issueNumber: issue.number,
            hasParts: !!dto.partsReplaced,
          },
          relatedIssueId: issue.id,
        },
        tx,
      );
      return record;
    });
  }

  /** Resolve an issue — requires at least one maintenance note. */
  async resolve(id: string, user: AuthUser, finalCondition?: string) {
    const issue = await this.getIssueOrThrow(id);
    this.assertCanModify(issue, user);

    if (!canTransition(issue.status, IssueStatus.RESOLVED)) {
      throw new ConflictException(
        `Cannot resolve an issue in status ${issue.status}`,
      );
    }

    const noteCount = await this.maintenance.countForIssue(id, this.prisma);
    if (noteCount === 0) {
      throw new BadRequestException(
        'Cannot resolve without recording a maintenance note',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.issue.update({
        where: { id },
        data: { status: IssueStatus.RESOLVED },
      });

      // Return the asset to Operational only if no other issues remain open.
      const otherOpen = await tx.issue.count({
        where: {
          assetId: issue.assetId,
          id: { not: id },
          status: { in: OPEN_ISSUE_STATUSES },
        },
      });
      if (otherOpen === 0) {
        await tx.asset.update({
          where: { id: issue.assetId },
          data: {
            status: AssetStatus.OPERATIONAL,
            ...(finalCondition ? { condition: finalCondition } : {}),
          },
        });
      }

      await this.history.record(
        {
          assetId: issue.assetId,
          action: HistoryAction.ISSUE_RESOLVED,
          actorId: user.id,
          detail: { issueNumber: issue.number },
          relatedIssueId: issue.id,
        },
        tx,
      );
      return updated;
    });
  }

  /** Reopen a resolved/closed issue. */
  async reopen(id: string, user: AuthUser) {
    const issue = await this.getIssueOrThrow(id);
    this.assertCanModify(issue, user);
    if (!canTransition(issue.status, IssueStatus.REOPENED)) {
      throw new ConflictException(
        `Only resolved or closed issues can be reopened (current: ${issue.status})`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.issue.update({
        where: { id },
        data: { status: IssueStatus.REOPENED },
      });
      await tx.asset.update({
        where: { id: issue.assetId },
        data: { status: AssetStatus.ISSUE_REPORTED },
      });
      await this.history.record(
        {
          assetId: issue.assetId,
          action: HistoryAction.ISSUE_REOPENED,
          actorId: user.id,
          detail: { issueNumber: issue.number },
          relatedIssueId: issue.id,
        },
        tx,
      );
      return updated;
    });
  }

  /** Close a resolved issue. Admin/Supervisor only (enforced in controller). */
  async close(id: string, user: AuthUser) {
    const issue = await this.getIssueOrThrow(id);
    if (!canTransition(issue.status, IssueStatus.CLOSED)) {
      throw new ConflictException(
        `Only resolved issues can be closed (current: ${issue.status})`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.issue.update({
        where: { id },
        data: { status: IssueStatus.CLOSED },
      });
      await this.history.record(
        {
          assetId: issue.assetId,
          action: HistoryAction.ISSUE_CLOSED,
          actorId: user.id,
          detail: { issueNumber: issue.number },
          relatedIssueId: issue.id,
        },
        tx,
      );
      return updated;
    });
  }

  /** Report an issue against an asset identified by its public QR id. */
  async reportByPublicId(publicId: string, dto: CreateIssueDto) {
    const asset = await this.prisma.asset.findUnique({ where: { publicId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status === AssetStatus.RETIRED) {
      throw new ConflictException(
        'This asset is retired and cannot accept new issue reports',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.generateNumber(tx);

      const issue = await tx.issue.create({
        data: {
          number,
          assetId: asset.id,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          priority: dto.priority ?? IssuePriority.MEDIUM,
          reporterName: dto.reporterName,
          reporterContact: dto.reporterContact,
          aiSuggested: (dto.aiSuggested as Prisma.InputJsonValue) ?? undefined,
          aiEdited: dto.aiEdited ?? false,
        },
      });

      // Reporting an issue moves the asset into the ISSUE_REPORTED state
      // (unless it is already being worked on).
      const workingStates: AssetStatus[] = [
        AssetStatus.UNDER_INSPECTION,
        AssetStatus.UNDER_MAINTENANCE,
        AssetStatus.OUT_OF_SERVICE,
      ];
      if (!workingStates.includes(asset.status)) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { status: AssetStatus.ISSUE_REPORTED },
        });
      }

      await this.history.record(
        {
          assetId: asset.id,
          action: HistoryAction.ISSUE_REPORTED,
          detail: { issueNumber: number, priority: issue.priority },
          relatedIssueId: issue.id,
        },
        tx,
      );

      return issue;
    });
  }

  async findAll(query: QueryIssuesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.IssueWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assetId) where.assetId = query.assetId;
    if (query.assignedTechnicianId)
      where.assignedTechnicianId = query.assignedTechnicianId;
    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.issue.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          asset: { select: { id: true, code: true, name: true, location: true } },
          assignedTechnician: { select: { id: true, name: true } },
        },
      }),
      this.prisma.issue.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: {
        asset: true,
        assignedTechnician: { select: { id: true, name: true, email: true } },
        maintenanceRecords: {
          orderBy: { createdAt: 'desc' },
          include: {
            technician: { select: { id: true, name: true } },
            evidence: true,
          },
        },
        evidence: true,
      },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  /** Safe public status lookup by issue number — no internal details. */
  async getPublicStatus(number: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { number },
      select: {
        number: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        asset: { select: { code: true, name: true } },
      },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  private async generateNumber(tx: Prisma.TransactionClient): Promise<string> {
    const last = await tx.issue.findFirst({
      where: { number: { startsWith: 'ISS-' } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const lastNum = last ? parseInt(last.number.replace('ISS-', ''), 10) : 0;
    const next = Number.isNaN(lastNum) ? 1 : lastNum + 1;
    return `ISS-${String(next).padStart(6, '0')}`;
  }
}
