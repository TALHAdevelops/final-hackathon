import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PublicService } from './public.service';
import { IssuesService } from '../issues/issues.service';
import { CreateIssueDto } from '../issues/dto/create-issue.dto';
import { AiService } from '../ai/ai.service';
import { TriageDto } from '../ai/dto/triage.dto';

// No guards — this is the public, QR-accessible surface.
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly issues: IssuesService,
    private readonly ai: AiService,
  ) {}

  @Get('assets/:publicId')
  getAsset(@Param('publicId') publicId: string) {
    return this.publicService.getAssetByPublicId(publicId);
  }

  // AI Issue Triage — turn a natural-language complaint into structured
  // suggestions the reporter can review and edit before submitting.
  @Post('assets/:publicId/triage')
  triage(
    @Param('publicId') publicId: string,
    @Body() dto: TriageDto,
  ) {
    return this.ai.triageForPublicAsset(publicId, dto.complaint);
  }

  // Report an issue against an asset from its public QR page.
  @Post('assets/:publicId/issues')
  reportIssue(
    @Param('publicId') publicId: string,
    @Body() dto: CreateIssueDto,
  ) {
    return this.issues.reportByPublicId(publicId, dto);
  }

  // Reporter can check the status of their issue by its number.
  @Get('issues/:number')
  issueStatus(@Param('number') number: string) {
    return this.issues.getPublicStatus(number);
  }
}
