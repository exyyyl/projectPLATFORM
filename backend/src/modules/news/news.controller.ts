import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import {
  NewsDetailResponseDto,
  NewsPageResponseDto,
  NewsQueryDto,
} from './dto';
import { NewsService } from './news.service';

@ApiTags('news')
@ApiBearerAuth()
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'List published news visible to the current role' })
  @ApiOkResponse({ type: NewsPageResponseDto })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: NewsQueryDto) {
    return this.newsService.findPublished(user.tenantId, user.role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one published news item' })
  @ApiOkResponse({ type: NewsDetailResponseDto })
  @ApiNotFoundResponse({
    description: 'News is missing, unpublished or not visible to this role',
  })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.newsService.findPublishedOne(id, user.tenantId, user.role);
  }
}
