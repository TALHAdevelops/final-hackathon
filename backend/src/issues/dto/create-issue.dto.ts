import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IssuePriority } from '@prisma/client';

export class CreateIssueDto {
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  title!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reporterName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reporterContact?: string;

  // Raw AI triage output attached at submit time (optional), plus whether the
  // reporter edited those suggestions before submitting.
  @IsOptional()
  aiSuggested?: Record<string, unknown>;

  @IsOptional()
  aiEdited?: boolean;
}
