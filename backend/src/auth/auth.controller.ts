import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Public self-registration — always a TECHNICIAN. Privileged roles
  // (ADMIN/SUPERVISOR) can only be created by an existing ADMIN below.
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto, UserRole.TECHNICIAN);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  // Admin-only: create a user with any role (technician, supervisor, admin).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('users')
  createUser(@Body() dto: RegisterDto) {
    return this.auth.register(dto, dto.role ?? UserRole.TECHNICIAN);
  }
}
