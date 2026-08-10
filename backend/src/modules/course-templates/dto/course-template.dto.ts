import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { GradingType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeExtensions = ({ value }: { value: unknown }): unknown => {
  if (!Array.isArray(value)) return value;
  const items: unknown[] = value;
  return items.map((item) =>
    typeof item === 'string'
      ? item.trim().toLowerCase().replace(/^\./, '')
      : item,
  );
};

export class CreateCourseTemplateDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  disciplineId!: number;

  @ApiPropertyOptional({ description: 'Required for admin/superadmin' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  ownerId?: number;

  @ApiProperty({ minLength: 3, maxLength: 200 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateCourseTemplateDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 200 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class CreateCourseRunDto {
  @ApiProperty({ example: '2026/2027' })
  @Matches(/^\d{4}\/\d{4}$/)
  academicYear!: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 3 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  semester?: number;

  @ApiPropertyOptional({ description: 'Admin may select another teacher' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  teacherId?: number;

  @ApiPropertyOptional({ minLength: 3, maxLength: 200 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ type: [Number], maxItems: 100 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  teachingAssignmentIds?: number[];
}

export class CreateTemplateBlockDto {
  @ApiProperty({ minLength: 2, maxLength: 200 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex!: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

export class UpdateTemplateBlockDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 200 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}

export class CreateTemplateAssignmentDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  blockId?: number;

  @ApiProperty({ minLength: 2, maxLength: 200 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ maxLength: 10000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiProperty({ enum: GradingType })
  @IsEnum(GradingType)
  gradingType!: GradingType;

  @ApiPropertyOptional({ minimum: 1, maximum: 100000 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  maxScore?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 3660 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3660)
  deadlineOffsetDays?: number;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @Transform(normalizeExtensions)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^[a-z0-9]{1,10}$/, { each: true })
  allowedExtensions?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 3 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 5 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxFiles?: number;

  @ApiPropertyOptional({ minimum: 1024, maximum: 104857600 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(104857600)
  maxFileSizeBytes?: number;

  @ApiPropertyOptional({ minimum: 1024, maximum: 262144000 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(262144000)
  maxTotalSizeBytes?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowLateSubmissions?: boolean;
}

export class UpdateTemplateAssignmentDto {
  @ApiPropertyOptional({ nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  blockId?: number | null;

  @ApiPropertyOptional({ minLength: 2, maxLength: 200 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 10000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ enum: GradingType })
  @IsOptional()
  @IsEnum(GradingType)
  gradingType?: GradingType;

  @ApiPropertyOptional({ minimum: 1, maximum: 100000, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  maxScore?: number | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 3660, nullable: true })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3660)
  deadlineOffsetDays?: number | null;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @Transform(normalizeExtensions)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^[a-z0-9]{1,10}$/, { each: true })
  allowedExtensions?: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxFiles?: number;

  @ApiPropertyOptional({ minimum: 1024, maximum: 104857600 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(104857600)
  maxFileSizeBytes?: number;

  @ApiPropertyOptional({ minimum: 1024, maximum: 262144000 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(262144000)
  maxTotalSizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowLateSubmissions?: boolean;
}
