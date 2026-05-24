import { Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  findAll() {
    return { message: 'TODO: GET /assignments' };
  }

  @Post()
  create() {
    return { message: 'TODO: POST /assignments' };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { message: `TODO: GET /assignments/${id}` };
  }

  @Put(':id')
  update(@Param('id') id: string) {
    return { message: `TODO: PUT /assignments/${id}` };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { message: `TODO: DELETE /assignments/${id}` };
  }
}
