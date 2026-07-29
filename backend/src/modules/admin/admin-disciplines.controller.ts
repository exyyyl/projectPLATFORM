import { Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { DisciplinesService } from '../disciplines/disciplines.service';

@Roles(UserRole.admin)
@Controller('admin/disciplines')
export class AdminDisciplinesController {
  constructor(private readonly disciplinesService: DisciplinesService) {}

  @Get()
  findAll() {
    return { message: 'TODO: GET /admin/disciplines' };
  }

  @Post()
  create() {
    return { message: 'TODO: POST /admin/disciplines' };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { message: `TODO: GET /admin/disciplines/${id}` };
  }

  @Put(':id')
  update(@Param('id') id: string) {
    return { message: `TODO: PUT /admin/disciplines/${id}` };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { message: `TODO: DELETE /admin/disciplines/${id}` };
  }
}
