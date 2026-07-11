import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  async addToIssue(issueId: string, file: Express.Multer.File) {
    const issue = await this.prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    const { url, type } = await this.uploads.upload(file);
    return this.prisma.evidence.create({
      data: { issueId, url, type },
    });
  }

  async addToMaintenance(recordId: string, file: Express.Multer.File) {
    const record = await this.prisma.maintenanceRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) throw new NotFoundException('Maintenance record not found');

    const { url, type } = await this.uploads.upload(file);
    return this.prisma.evidence.create({
      data: { maintenanceRecordId: recordId, url, type },
    });
  }

  listForIssue(issueId: string) {
    return this.prisma.evidence.findMany({
      where: { issueId },
      orderBy: { uploadedAt: 'desc' },
    });
  }
}
