import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { CourseTemplatesService } from './course-templates.service';
import {
  CreateCourseRunDto,
  CreateCourseTemplateDto,
  CreateTemplateAssignmentDto,
  CreateTemplateBlockDto,
  UpdateCourseTemplateDto,
  UpdateTemplateAssignmentDto,
  UpdateTemplateBlockDto,
} from './dto';

@ApiTags('course templates')
@ApiBearerAuth()
@Roles(UserRole.teacher, UserRole.admin)
@Controller('course-templates')
@ApiForbiddenResponse({
  description: 'Role or ownership does not allow access',
})
@ApiNotFoundResponse({ description: 'Template or nested resource not found' })
export class CourseTemplatesController {
  constructor(private readonly service: CourseTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List manageable reusable course templates' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a reusable course template' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCourseTemplateDto,
  ) {
    return this.service.create(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template with blocks, assignments and runs' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(id, user);
  }

  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseTemplateDto,
  ) {
    return this.service.update(id, user, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate template without deleting its runs' })
  deactivate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deactivate(id, user);
  }

  @Post(':id/runs')
  @ApiOperation({ summary: 'Create an independent academic-year run snapshot' })
  @ApiBadRequestResponse({ description: 'Dates or academic year are invalid' })
  @ApiConflictResponse({
    description: 'Run exists or assignments do not match',
  })
  createRun(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCourseRunDto,
  ) {
    return this.service.createRun(id, user, dto);
  }

  @Get(':id/blocks')
  listBlocks(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.listBlocks(id, user);
  }

  @Post(':id/blocks')
  createBlock(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTemplateBlockDto,
  ) {
    return this.service.createBlock(id, user, dto);
  }

  @Put(':id/blocks/:blockId')
  updateBlock(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('blockId', ParseIntPipe) blockId: number,
    @Body() dto: UpdateTemplateBlockDto,
  ) {
    return this.service.updateBlock(id, blockId, user, dto);
  }

  @Delete(':id/blocks/:blockId')
  removeBlock(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('blockId', ParseIntPipe) blockId: number,
  ) {
    return this.service.removeBlock(id, blockId, user);
  }

  @Get(':id/assignments')
  listAssignments(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.listAssignments(id, user);
  }

  @Post(':id/assignments')
  createAssignment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTemplateAssignmentDto,
  ) {
    return this.service.createAssignment(id, user, dto);
  }

  @Put(':id/assignments/:assignmentId')
  updateAssignment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: UpdateTemplateAssignmentDto,
  ) {
    return this.service.updateAssignment(id, assignmentId, user, dto);
  }

  @Delete(':id/assignments/:assignmentId')
  removeAssignment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return this.service.removeAssignment(id, assignmentId, user);
  }
}
