import { Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GroupsService } from '../groups/groups.service';

@Roles(UserRole.admin)
@Controller('admin/groups')
export class AdminGroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  findAll() {
    return { message: 'TODO: GET /admin/groups' };
  }

  @Post()
  create() {
    return { message: 'TODO: POST /admin/groups' };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { message: `TODO: GET /admin/groups/${id}` };
  }

  @Put(':id')
  update(@Param('id') id: string) {
    return { message: `TODO: PUT /admin/groups/${id}` };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { message: `TODO: DELETE /admin/groups/${id}` };
  }
}
