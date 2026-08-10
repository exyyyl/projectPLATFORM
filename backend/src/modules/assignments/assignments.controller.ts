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
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto';

@ApiTags('assignments')
@ApiBearerAuth()
@Controller()
@ApiNotFoundResponse({ description: 'Assignment or course is unavailable' })
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('courses/:courseId/assignments')
  @ApiOperation({ summary: 'List assignments visible in an accessible course' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.assignmentsService.findAll(courseId, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Post('courses/:courseId/assignments')
  @ApiOperation({ summary: 'Create a draft assignment in a course run' })
  @ApiBadRequestResponse({ description: 'DTO or grading settings are invalid' })
  @ApiForbiddenResponse({
    description: 'Role or ownership does not allow access',
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.create(courseId, user, dto);
  }

  @Get('assignments/:id')
  @ApiOperation({ summary: 'Get one accessible assignment' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.assignmentsService.findOne(id, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Put('assignments/:id')
  @ApiConflictResponse({ description: 'Assignment/course is read-only' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.update(id, user, dto);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Post('assignments/:id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.assignmentsService.publish(id, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Post('assignments/:id/close')
  @HttpCode(HttpStatus.OK)
  close(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.assignmentsService.close(id, user);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Delete('assignments/:id')
  @ApiConflictResponse({ description: 'Only an unused draft can be deleted' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.assignmentsService.remove(id, user);
  }
}
