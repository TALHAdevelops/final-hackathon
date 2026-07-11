import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  // Optional — only ADMIN may create privileged roles (enforced in controller/service)
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
