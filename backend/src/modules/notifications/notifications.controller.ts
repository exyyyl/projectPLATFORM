import { Controller, Get, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll() {
    return { message: 'TODO: GET /notifications' };
  }

  @Patch()
  markRead() {
    return { message: 'TODO: PATCH /notifications' };
  }
}
