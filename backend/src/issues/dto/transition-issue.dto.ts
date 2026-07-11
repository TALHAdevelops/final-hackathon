import { IsEnum } from 'class-validator';
import { IssueStatus } from '@prisma/client';

export class TransitionIssueDto {
  @IsEnum(IssueStatus)
  status!: IssueStatus;
}
