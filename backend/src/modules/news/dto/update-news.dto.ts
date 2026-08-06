import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NewsTargetRole } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateNewsDto {
  @ApiPropertyOptional({ minLength: 3, maxLength: 200 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    maxLength: 500,
    nullable: true,
    description: 'Set null to use an excerpt derived from Markdown.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string | null;

  @ApiPropertyOptional({ maxLength: 100000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  bodyMarkdown?: string;

  @ApiPropertyOptional({ enum: NewsTargetRole })
  @IsOptional()
  @IsEnum(NewsTargetRole)
  targetRole?: NewsTargetRole;
}
