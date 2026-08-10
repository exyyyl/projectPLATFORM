import { Module } from '@nestjs/common';
import { CourseTemplatesController } from './course-templates.controller';
import { CourseTemplatesService } from './course-templates.service';

@Module({
  controllers: [CourseTemplatesController],
  providers: [CourseTemplatesService],
  exports: [CourseTemplatesService],
})
export class CourseTemplatesModule {}
