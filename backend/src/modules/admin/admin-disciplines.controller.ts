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
  ApiConflictResponse,
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
  AssignGroupsDto,
  AssignTeachersDto,
  CreateDisciplineDto,
  CreateTeachingAssignmentDto,
  DisciplineDetailResponseDto,
  DisciplinesPageResponseDto,
  DisciplinesQueryDto,
  TeachingAssignmentResponseDto,
  UpdateDisciplineDto,
} from '../disciplines/dto';
import { DisciplinesService } from '../disciplines/disciplines.service';

@Roles(UserRole.admin)
@ApiTags('admin/disciplines')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
@ApiForbiddenResponse({ description: 'Admin role is required' })
@Controller('admin/disciplines')
export class AdminDisciplinesController {
  constructor(private readonly disciplinesService: DisciplinesService) {}

  @Get()
  @ApiOperation({ summary: 'List and search disciplines in the admin tenant' })
  @ApiOkResponse({ type: DisciplinesPageResponseDto })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: DisciplinesQueryDto,
  ) {
    return this.disciplinesService.findAll(user.tenantId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a discipline in the admin tenant' })
  @ApiCreatedResponse({ type: DisciplineDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Discipline name already exists' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDisciplineDto) {
    return this.disciplinesService.create(user.tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a discipline and all its assignments' })
  @ApiOkResponse({ type: DisciplineDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Discipline not found in this tenant' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.disciplinesService.findOne(id, user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a discipline in the admin tenant' })
  @ApiOkResponse({ type: DisciplineDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or empty request body' })
  @ApiConflictResponse({ description: 'Discipline name already exists' })
  @ApiNotFoundResponse({ description: 'Discipline not found in this tenant' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDisciplineDto,
  ) {
    return this.disciplinesService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a discipline without courses' })
  @ApiOkResponse({ type: DisciplineDetailResponseDto })
  @ApiConflictResponse({ description: 'The discipline still has courses' })
  @ApiNotFoundResponse({ description: 'Discipline not found in this tenant' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.disciplinesService.remove(id, user.tenantId);
  }

  @Post(':id/teachers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign active teachers to a discipline' })
  @ApiOkResponse({ type: DisciplineDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid teacher IDs' })
  assignTeachers(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTeachersDto,
  ) {
    return this.disciplinesService.assignTeachers(id, user.tenantId, dto);
  }

  @Delete(':id/teachers/:teacherId')
  @ApiOperation({ summary: 'Remove a teacher and matching triple assignments' })
  @ApiOkResponse({ type: DisciplineDetailResponseDto })
  @ApiNotFoundResponse({
    description: 'Discipline or teacher assignment not found',
  })
  removeTeacher(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('teacherId', ParseIntPipe) teacherId: number,
  ) {
    return this.disciplinesService.removeTeacher(id, teacherId, user.tenantId);
  }

  @Post(':id/groups')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign tenant groups to a discipline' })
  @ApiOkResponse({ type: DisciplineDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid group IDs' })
  assignGroups(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignGroupsDto,
  ) {
    return this.disciplinesService.assignGroups(id, user.tenantId, dto);
  }

  @Delete(':id/groups/:groupId')
  @ApiOperation({ summary: 'Remove a group and matching triple assignments' })
  @ApiOkResponse({ type: DisciplineDetailResponseDto })
  @ApiNotFoundResponse({
    description: 'Discipline or group assignment not found',
  })
  removeGroup(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.disciplinesService.removeGroup(id, groupId, user.tenantId);
  }

  @Post(':id/teaching-assignments')
  @ApiOperation({
    summary: 'Assign a teacher to teach this discipline to a group',
  })
  @ApiCreatedResponse({ type: TeachingAssignmentResponseDto })
  @ApiBadRequestResponse({ description: 'Teacher or group is invalid' })
  @ApiConflictResponse({
    description:
      'Teacher/group is not assigned to the discipline or the triple already exists',
  })
  createTeachingAssignment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTeachingAssignmentDto,
  ) {
    return this.disciplinesService.createTeachingAssignment(
      id,
      user.tenantId,
      dto,
    );
  }

  @Delete(':id/teaching-assignments/:assignmentId')
  @ApiOperation({ summary: 'Delete one teacher-discipline-group assignment' })
  @ApiOkResponse({ type: TeachingAssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'Teaching assignment not found' })
  removeTeachingAssignment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return this.disciplinesService.removeTeachingAssignment(
      id,
      assignmentId,
      user.tenantId,
    );
  }
}
