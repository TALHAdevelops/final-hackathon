import { IsString } from 'class-validator';

export class AssignIssueDto {
  @IsString()
  technicianId!: string;
}
