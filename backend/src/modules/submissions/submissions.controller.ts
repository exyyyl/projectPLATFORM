import { Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SubmissionsService } from './submissions.service';

@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Roles(UserRole.student)
  @Post('assignments/:assignmentId/submissions')
  submit(@Param('assignmentId') assignmentId: string) {
    return { message: `TODO: POST /assignments/${assignmentId}/submissions` };
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Get('assignments/:assignmentId/submissions')
  listByAssignment(@Param('assignmentId') assignmentId: string) {
    return { message: `TODO: GET /assignments/${assignmentId}/submissions` };
  }
}
