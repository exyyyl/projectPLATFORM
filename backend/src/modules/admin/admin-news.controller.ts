import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AdminNewsQueryDto,
  CreateNewsDto,
  NewsDetailResponseDto,
  NewsPageResponseDto,
  UpdateNewsDto,
} from '../news/dto';
import { NewsService } from '../news/news.service';

@Roles(UserRole.admin)
@ApiTags('admin/news')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
@ApiForbiddenResponse({ description: 'Admin role is required' })
@Controller('admin/news')
export class AdminNewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'List drafts and published news for the admin' })
  @ApiOkResponse({ type: NewsPageResponseDto })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: AdminNewsQueryDto) {
    return this.newsService.findAllForAdmin(user.tenantId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a news draft' })
  @ApiCreatedResponse({ type: NewsDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateNewsDto) {
    return this.newsService.createForAdmin(user.tenantId, user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a draft or published news item' })
  @ApiOkResponse({ type: NewsDetailResponseDto })
  @ApiNotFoundResponse({ description: 'News item not found' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.newsService.findOneForAdmin(id, user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update news content or audience' })
  @ApiOkResponse({ type: NewsDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or empty request body' })
  @ApiNotFoundResponse({ description: 'News item not found' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNewsDto,
  ) {
    return this.newsService.updateForAdmin(id, user.tenantId, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a news item immediately' })
  @ApiOkResponse({ type: NewsDetailResponseDto })
  @ApiNotFoundResponse({ description: 'News item not found' })
  publish(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.newsService.publish(id, user.tenantId);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return a published news item to drafts' })
  @ApiOkResponse({ type: NewsDetailResponseDto })
  @ApiNotFoundResponse({ description: 'News item not found' })
  unpublish(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.newsService.unpublish(id, user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a news item' })
  @ApiOkResponse({ type: NewsDetailResponseDto })
  @ApiNotFoundResponse({ description: 'News item not found' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.newsService.remove(id, user.tenantId);
  }
}
