import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import {
  AdminModule,
  AssignmentsModule,
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
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
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
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
