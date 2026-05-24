import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';

/**
 * Админ-панель: управление пользователями.
 * URL всегда с префиксом /admin/ — только для роли admin (после включения JWT).
 */
@Roles(UserRole.admin)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Тест: GET http://localhost:3000/v1/admin/users */
  @Public()
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create() {
    return { message: 'TODO: POST /admin/users' };
  }

  @Post('import')
  importUsers() {
    return { message: 'TODO: POST /admin/users/import' };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { message: `TODO: GET /admin/users/${id}` };
  }

  @Put(':id')
  update(@Param('id') id: string) {
    return { message: `TODO: PUT /admin/users/${id}` };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { message: `TODO: DELETE /admin/users/${id}` };
  }
}
