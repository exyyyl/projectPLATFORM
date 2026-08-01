import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AdminUserResponseDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 1 })
  tenantId: number;

  @ApiProperty({ example: 'student@demo.local', format: 'email' })
  email: string;

  @ApiProperty({ example: 'Иван Студентов' })
  fullName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.student })
  role: UserRole;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-05-24T06:35:18.320Z', format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ example: '2026-05-24T06:35:18.320Z', format: 'date-time' })
  updatedAt: Date;
}

class AdminUsersPaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class AdminUsersPageResponseDto {
  @ApiProperty({ type: [AdminUserResponseDto] })
  items: AdminUserResponseDto[];

  @ApiProperty({ type: AdminUsersPaginationDto })
  pagination: AdminUsersPaginationDto;
}
