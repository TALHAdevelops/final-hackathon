import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EvidenceService } from './evidence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

@UseGuards(JwtAuthGuard)
@Controller()
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Post('issues/:id/evidence')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  addToIssue(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.evidence.addToIssue(id, file);
  }

  @Get('issues/:id/evidence')
  listForIssue(@Param('id') id: string) {
    return this.evidence.listForIssue(id);
  }

  @Post('maintenance/:id/evidence')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  addToMaintenance(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.evidence.addToMaintenance(id, file);
  }
}
