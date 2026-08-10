import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { AcademicService } from './academic.service';

@ApiTags('academic')
@ApiBearerAuth()
@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get the current role-specific academic overview',
  })
  @ApiOkResponse({
    description:
      'Student groups/courses, teacher disciplines/groups, admin summary or superadmin tenants',
  })
  overview(@CurrentUser() user: JwtPayload) {
    return this.academicService.getOverview(user);
  }
}
