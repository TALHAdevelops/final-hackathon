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
import { IssuesService } from './issues.service';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { AssignIssueDto } from './dto/assign-issue.dto';
import { TransitionIssueDto } from './dto/transition-issue.dto';
import { CreateMaintenanceDto } from '../maintenance/dto/create-maintenance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('issues')
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @Get()
  findAll(@Query() query: QueryIssuesDto) {
    return this.issues.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.issues.findOne(id);
  }

  // Assignment — Admin/Supervisor only.
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignIssueDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.issues.assign(id, dto.technicianId, user);
  }

  // Generic status transition (e.g. INSPECTION_STARTED, WAITING_FOR_PARTS).
  @Patch(':id/status')
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionIssueDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.issues.transition(id, dto.status, user);
  }

  // Record maintenance work (notes required).
  @Post(':id/maintenance')
  addMaintenance(
    @Param('id') id: string,
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.issues.addMaintenance(id, dto, user);
  }

  // Resolve — requires at least one maintenance note.
  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.issues.resolve(id, user);
  }

  @Patch(':id/reopen')
  reopen(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.issues.reopen(id, user);
  }

  // Close — Admin/Supervisor only.
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Patch(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.issues.close(id, user);
  }
}
