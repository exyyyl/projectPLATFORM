import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialType } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCourseDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  disciplineId!: number;

  @ApiPropertyOptional({
    description: 'Required when an admin creates a course',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  teacherId?: number;

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

export class UpdateCourseDto {
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

export class AssignCourseGroupsDto {
  @ApiProperty({ type: [Number], maxItems: 100 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  teachingAssignmentIds!: number[];
}

export class CreateCourseBlockDto {
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

export class UpdateCourseBlockDto {
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

export class CreateMaterialDto {
  @ApiProperty({ minLength: 2, maxLength: 200 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: MaterialType })
  @IsEnum(MaterialType)
  type!: MaterialType;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  blockId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  url?: string;

  @ApiPropertyOptional({
    description: 'Internal object path returned by file upload',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  filePath?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  defaultAvailableAt?: string;
}

export class UpdateMaterialDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 200 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: MaterialType })
  @IsOptional()
  @IsEnum(MaterialType)
  type?: MaterialType;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  url?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  filePath?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  defaultAvailableAt?: string | null;
}

export type MaterialReleaseAction =
  | 'inherit'
  | 'schedule'
  | 'publish_now'
  | 'withhold';

export class SetMaterialReleaseDto {
  @ApiProperty({
    enum: ['inherit', 'schedule', 'publish_now', 'withhold'],
  })
  @IsIn(['inherit', 'schedule', 'publish_now', 'withhold'])
  action!: MaterialReleaseAction;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
