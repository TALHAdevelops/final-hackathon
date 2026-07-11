import { IsString, MaxLength, MinLength } from 'class-validator';

export class TriageDto {
  // The reporter's natural-language complaint.
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  complaint!: string;
}
