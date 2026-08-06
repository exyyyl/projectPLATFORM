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
  AssignStudentsDto,
  CreateGroupDto,
  GroupDetailResponseDto,
  GroupsPageResponseDto,
  GroupsQueryDto,
  UpdateGroupDto,
} from '../groups/dto';
import { GroupsService } from '../groups/groups.service';

@Roles(UserRole.admin)
@ApiTags('admin/groups')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
@ApiForbiddenResponse({ description: 'Admin role is required' })
@Controller('admin/groups')
export class AdminGroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter groups in the admin tenant' })
  @ApiOkResponse({ type: GroupsPageResponseDto })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: GroupsQueryDto) {
    return this.groupsService.findAll(user.tenantId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a group in the admin tenant' })
  @ApiCreatedResponse({ type: GroupDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiConflictResponse({ description: 'Group name already exists' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a group with its assigned students' })
  @ApiOkResponse({ type: GroupDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Group not found in this tenant' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.groupsService.findOne(id, user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a group in the admin tenant' })
  @ApiOkResponse({ type: GroupDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or empty request body' })
  @ApiConflictResponse({ description: 'Group name already exists' })
  @ApiNotFoundResponse({ description: 'Group not found in this tenant' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a group and its assignments' })
  @ApiOkResponse({ type: GroupDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Group not found in this tenant' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.groupsService.remove(id, user.tenantId);
  }

  @Post(':id/students')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign active students to a group' })
  @ApiOkResponse({ type: GroupDetailResponseDto })
  @ApiBadRequestResponse({
    description:
      'A user is inactive, not a student or belongs to another tenant',
  })
  @ApiNotFoundResponse({ description: 'Group not found in this tenant' })
  assignStudents(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignStudentsDto,
  ) {
    return this.groupsService.assignStudents(id, user.tenantId, dto);
  }

  @Delete(':id/students/:studentId')
  @ApiOperation({ summary: 'Remove a student from a group' })
  @ApiOkResponse({ type: GroupDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Group or student assignment not found' })
  removeStudent(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.groupsService.removeStudent(id, studentId, user.tenantId);
  }
}
