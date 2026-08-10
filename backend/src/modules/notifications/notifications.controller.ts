import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user notifications' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.findAll(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one current user notification as read' })
  markRead(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markRead(id, user.id);
  }
}
