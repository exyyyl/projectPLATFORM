import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FilesModule } from '../files/files.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  imports: [
    FilesModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const positiveInt = (key: string, fallback: number) => {
          const value = Number(config.get<string>(key));
          return Number.isInteger(value) && value > 0 ? value : fallback;
        };
        const maxFiles = positiveInt('UPLOAD_HARD_MAX_FILES', 5);
        return {
          storage: memoryStorage(),
          limits: {
            files: maxFiles,
            fileSize: positiveInt(
              'UPLOAD_HARD_MAX_FILE_SIZE_BYTES',
              26_214_400,
            ),
            fields: 1,
            fieldSize: 8_192,
            parts: maxFiles + 1,
          },
        };
      },
    }),
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
