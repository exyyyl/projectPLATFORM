import { Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  findAll() {
    return { message: 'TODO: GET /news' };
  }

  @Roles(UserRole.admin)
  @Post()
  create() {
    return { message: 'TODO: POST /news' };
  }
}
