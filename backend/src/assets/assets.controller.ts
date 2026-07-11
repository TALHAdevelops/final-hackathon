import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AssetsService } from './assets.service';
import { HistoryService } from '../history/history.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { QueryAssetsDto } from './dto/query-assets.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assets: AssetsService,
    private readonly history: HistoryService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthUser) {
    return this.assets.create(dto, user.id);
  }

  // Any authenticated staff member can browse/search assets.
  @Get()
  findAll(@Query() query: QueryAssetsDto) {
    return this.assets.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assets.findOne(id);
  }

  @Get(':id/history')
  history_(@Param('id') id: string) {
    return this.history.findByAsset(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.update(id, dto, user.id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/retire')
  retire(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assets.retire(id, user.id);
  }
}
