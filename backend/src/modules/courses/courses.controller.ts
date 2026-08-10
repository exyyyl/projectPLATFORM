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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CoursesService } from './courses.service';
import {
  AssignCourseGroupsDto,
  CreateCourseBlockDto,
  CreateCourseDto,
  CreateMaterialDto,
  SetMaterialReleaseDto,
  UpdateCourseDto,
  UpdateCourseBlockDto,
  UpdateMaterialDto,
} from './dto';

@ApiTags('courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List courses available to the current role' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.coursesService.findAll(user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Post()
  @ApiOperation({ summary: 'Create a course draft' })
  @ApiBadRequestResponse({ description: 'Invalid course data' })
  @ApiForbiddenResponse({ description: 'Teacher or admin role is required' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an accessible course and its content' })
  @ApiNotFoundResponse({ description: 'Course is missing or unavailable' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.coursesService.findOne(id, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, user, dto);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.coursesService.publish(id, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublish(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.coursesService.unpublish(id, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a course run and make it read-only' })
  archive(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.coursesService.archive(id, user);
  }

  @Get(':id/blocks')
  @ApiOperation({ summary: 'List blocks of an accessible course run' })
  listBlocks(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.coursesService.listBlocks(id, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Post(':id/blocks')
  @ApiOperation({ summary: 'Create a block in a mutable course run' })
  createBlock(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCourseBlockDto,
  ) {
    return this.coursesService.createBlock(id, user, dto);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Put(':id/blocks/:blockId')
  updateBlock(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('blockId', ParseIntPipe) blockId: number,
    @Body() dto: UpdateCourseBlockDto,
  ) {
    return this.coursesService.updateBlock(id, blockId, user, dto);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Delete(':id/blocks/:blockId')
  removeBlock(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('blockId', ParseIntPipe) blockId: number,
  ) {
    return this.coursesService.removeBlock(id, blockId, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Post(':id/groups')
  @HttpCode(HttpStatus.OK)
  assignGroups(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignCourseGroupsDto,
  ) {
    return this.coursesService.assignGroups(id, user, dto);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Delete(':id/groups/:courseGroupId')
  removeGroup(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('courseGroupId', ParseIntPipe) courseGroupId: number,
  ) {
    return this.coursesService.removeGroup(id, courseGroupId, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Get(':id/groups/:courseGroupId/progress')
  getGroupProgress(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('courseGroupId', ParseIntPipe) courseGroupId: number,
  ) {
    return this.coursesService.getGroupProgress(id, courseGroupId, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Post(':id/materials')
  createMaterial(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMaterialDto,
  ) {
    return this.coursesService.createMaterial(id, user, dto);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Put(':id/materials/:materialId')
  updateMaterial(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('materialId', ParseIntPipe) materialId: number,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.coursesService.updateMaterial(id, materialId, user, dto);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Put(':id/materials/:materialId/groups/:courseGroupId/release')
  setMaterialRelease(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('materialId', ParseIntPipe) materialId: number,
    @Param('courseGroupId', ParseIntPipe) courseGroupId: number,
    @Body() dto: SetMaterialReleaseDto,
  ) {
    return this.coursesService.setMaterialRelease(
      id,
      materialId,
      courseGroupId,
      user,
      dto,
    );
  }
}
