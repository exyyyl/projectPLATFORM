import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /** Редирект / выдача presigned URL по одноразовому токену. */
  @Public()
  @Get(':token')
  download(@Param('token') token: string) {
    return { message: `TODO: GET /files/${token}` };
  }
}
