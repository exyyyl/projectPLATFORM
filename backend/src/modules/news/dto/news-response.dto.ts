import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NewsStatus, NewsTargetRole } from '@prisma/client';

class NewsAuthorResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  fullName!: string;
}

export class NewsSummaryResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  excerpt!: string;

  @ApiProperty({ enum: NewsTargetRole })
  targetRole!: NewsTargetRole;

  @ApiProperty({ enum: NewsStatus })
  status!: NewsStatus;

  @ApiPropertyOptional({ nullable: true })
  publishedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: NewsAuthorResponseDto })
  author!: NewsAuthorResponseDto;
}

export class NewsDetailResponseDto extends NewsSummaryResponseDto {
  @ApiProperty()
  bodyMarkdown!: string;
}

class NewsPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class NewsPageResponseDto {
  @ApiProperty({ type: [NewsSummaryResponseDto] })
  items!: NewsSummaryResponseDto[];

  @ApiProperty({ type: NewsPaginationResponseDto })
  pagination!: NewsPaginationResponseDto;
}
