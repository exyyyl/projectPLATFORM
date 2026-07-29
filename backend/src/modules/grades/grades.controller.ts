import { Controller, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GradesService } from './grades.service';

@Roles(UserRole.teacher, UserRole.admin)
@Controller('submissions')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Post(':id/grade')
  grade(@Param('id') id: string) {
    return { message: `TODO: POST /submissions/${id}/grade` };
  }
}
