import { Injectable } from '@nestjs/common';
import { IssuePriority, IssueStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const OPEN_ISSUE_STATUSES: IssueStatus[] = [
  IssueStatus.REPORTED,
  IssueStatus.ASSIGNED,
  IssueStatus.INSPECTION_STARTED,
  IssueStatus.MAINTENANCE_IN_PROGRESS,
  IssueStatus.WAITING_FOR_PARTS,
  IssueStatus.REOPENED,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      totalAssets,
      assetsByStatus,
      totalIssues,
      issuesByStatus,
      issuesByPriority,
      openIssues,
      criticalOpen,
      recentIssues,
      assetsDueService,
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.issue.count(),
      this.prisma.issue.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.issue.groupBy({ by: ['priority'], _count: { _all: true } }),
      this.prisma.issue.count({ where: { status: { in: OPEN_ISSUE_STATUSES } } }),
      this.prisma.issue.count({
        where: {
          status: { in: OPEN_ISSUE_STATUSES },
          priority: IssuePriority.CRITICAL,
        },
      }),
      this.prisma.issue.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          number: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          asset: { select: { code: true, name: true } },
        },
      }),
      // Assets whose next service date is today or already past.
      this.prisma.asset.count({
        where: { nextServiceDate: { lte: new Date() } },
      }),
    ]);

    const toMap = (
      rows: Array<Record<string, unknown> & { _count: { _all: number } }>,
      key: string,
    ): Record<string, number> =>
      Object.fromEntries(
        rows.map((r) => [String(r[key]), r._count._all]),
      );

    return {
      assets: {
        total: totalAssets,
        byStatus: toMap(assetsByStatus, 'status'),
        dueService: assetsDueService,
      },
      issues: {
        total: totalIssues,
        open: openIssues,
        criticalOpen,
        byStatus: toMap(issuesByStatus, 'status'),
        byPriority: toMap(issuesByPriority, 'priority'),
      },
      recentIssues,
    };
  }
}
