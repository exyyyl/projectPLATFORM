import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DisciplineTeacherResponseDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'teacher@demo.local', format: 'email' })
  email: string;

  @ApiProperty({ example: 'Павел Преподаватель' })
  fullName: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class DisciplineGroupResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ИВТ-21' })
  name: string;

  @ApiPropertyOptional({ example: 2, nullable: true })
  courseYear: number | null;

  @ApiPropertyOptional({ example: 'Программная инженерия', nullable: true })
  direction: string | null;
}

export class TeachingAssignmentResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: DisciplineTeacherResponseDto })
  teacher: DisciplineTeacherResponseDto;

  @ApiProperty({ type: DisciplineGroupResponseDto })
  group: DisciplineGroupResponseDto;
}

export class DisciplineResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  tenantId: number;

  @ApiProperty({ example: 'Алгоритмы и структуры данных' })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({ example: 2 })
  teacherCount: number;

  @ApiProperty({ example: 2 })
  groupCount: number;

  @ApiProperty({ example: 3 })
  teachingAssignmentCount: number;
}

export class DisciplineDetailResponseDto extends DisciplineResponseDto {
  @ApiProperty({ type: [DisciplineTeacherResponseDto] })
  teachers: DisciplineTeacherResponseDto[];

  @ApiProperty({ type: [DisciplineGroupResponseDto] })
  groups: DisciplineGroupResponseDto[];

  @ApiProperty({ type: [TeachingAssignmentResponseDto] })
  teachingAssignments: TeachingAssignmentResponseDto[];
}

class DisciplinesPaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class DisciplinesPageResponseDto {
  @ApiProperty({ type: [DisciplineResponseDto] })
  items: DisciplineResponseDto[];

  @ApiProperty({ type: DisciplinesPaginationDto })
  pagination: DisciplinesPaginationDto;
}
