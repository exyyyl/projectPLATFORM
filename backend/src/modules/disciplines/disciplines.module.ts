import { Module } from '@nestjs/common';
import { DisciplinesService } from './disciplines.service';

@Module({
  providers: [DisciplinesService],
  exports: [DisciplinesService],
})
export class DisciplinesModule {}
