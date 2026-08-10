import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BufferedUpload } from '../files/files.service';
import { CreateSubmissionDto } from './dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@ApiBearerAuth()
@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Roles(UserRole.student)
  @Post('assignments/:assignmentId/submissions')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        studentComment: { type: 'string', maxLength: 2000 },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['files'],
    },
  })
  @ApiOperation({ summary: 'Submit a new student attempt with private files' })
  submit(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: CreateSubmissionDto,
    @UploadedFiles() files: BufferedUpload[] = [],
  ) {
    return this.submissionsService.submit(assignmentId, user, dto, files);
  }

  @Roles(UserRole.teacher, UserRole.admin)
  @Get('assignments/:assignmentId/submissions')
  @ApiOperation({ summary: 'List attempts for a manageable assignment' })
  listByAssignment(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return this.submissionsService.listByAssignment(assignmentId, user);
  }
}
