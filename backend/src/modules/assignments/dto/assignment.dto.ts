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

export class CreateAssignmentDto {
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

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

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

export class UpdateAssignmentDto {
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

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  deadline?: string | null;

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
