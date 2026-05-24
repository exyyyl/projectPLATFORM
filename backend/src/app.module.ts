import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import {
  AdminModule,
  AssignmentsModule,
  AuthModule,
  ChatModule,
  CoursesModule,
  FilesModule,
  GradesModule,
  MaterialsModule,
  NewsModule,
  NotificationsModule,
  SubmissionsModule,
  UsersModule,
} from './modules';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AdminModule,
    CoursesModule,
    AssignmentsModule,
    SubmissionsModule,
    GradesModule,
    ChatModule,
    NotificationsModule,
    FilesModule,
    MaterialsModule,
    NewsModule,
  ],
})
export class AppModule {}
