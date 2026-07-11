import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { AssetStatus } from '@prisma/client';
import { CreateAssetDto } from './create-asset.dto';

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  // Status is generally driven by the issue/maintenance workflow, but an admin
  // may set it directly (e.g. mark OUT_OF_SERVICE). RETIRED goes through the
  // dedicated retire endpoint.
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;
}
