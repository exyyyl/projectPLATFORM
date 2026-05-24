import { Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll() {
    return { message: 'TODO: GET /courses' };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { message: `TODO: GET /courses/${id}` };
  }

  @Get(':id/blocks')
  listBlocks(@Param('id') id: string) {
    return { message: `TODO: GET /courses/${id}/blocks` };
  }

  @Post(':id/blocks')
  createBlock(@Param('id') id: string) {
    return { message: `TODO: POST /courses/${id}/blocks` };
  }

  @Put(':id/blocks/:blockId')
  updateBlock(@Param('id') id: string, @Param('blockId') blockId: string) {
    return { message: `TODO: PUT /courses/${id}/blocks/${blockId}` };
  }

  @Delete(':id/blocks/:blockId')
  removeBlock(@Param('id') id: string, @Param('blockId') blockId: string) {
    return { message: `TODO: DELETE /courses/${id}/blocks/${blockId}` };
  }
}
