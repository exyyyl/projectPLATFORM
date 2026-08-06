import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupStudentResponseDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'student@demo.local', format: 'email' })
  email: string;

  @ApiProperty({ example: 'Иван Студентов' })
  fullName: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class GroupResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  tenantId: number;

  @ApiProperty({ example: 'ИВТ-21' })
  name: string;

  @ApiPropertyOptional({ example: 2, nullable: true })
  courseYear: number | null;

  @ApiPropertyOptional({ example: 'Программная инженерия', nullable: true })
  direction: string | null;

  @ApiProperty({ example: 12 })
  studentCount: number;
}

export class GroupDetailResponseDto extends GroupResponseDto {
  @ApiProperty({ type: [GroupStudentResponseDto] })
  students: GroupStudentResponseDto[];
}

class GroupsPaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 2 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class GroupsPageResponseDto {
  @ApiProperty({ type: [GroupResponseDto] })
  items: GroupResponseDto[];

  @ApiProperty({ type: GroupsPaginationDto })
  pagination: GroupsPaginationDto;
}
