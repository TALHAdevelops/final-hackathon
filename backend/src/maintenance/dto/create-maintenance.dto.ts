import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMaintenanceDto {
  // Required — a maintenance note is mandatory (no resolve without a note).
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  notes!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  partsReplaced?: string;

  // Cost cannot be negative.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  // Time spent in minutes.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  timeSpent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  finalCondition?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
