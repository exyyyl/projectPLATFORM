import { Controller, Get, Post } from '@nestjs/common';
import { MaterialsService } from './materials.service';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  findAll() {
    return { message: 'TODO: GET /materials' };
  }

  @Post()
  create() {
    return { message: 'TODO: POST /materials' };
  }
}
