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
  AcademicModule,
  AdminModule,
  AssignmentsModule,
  ChatModule,
  CoursesModule,
  CourseTemplatesModule,
  FilesModule,
  GradesModule,
  MaterialsModule,
  NewsModule,
  NotificationsModule,
  SubmissionsModule,
  UsersModule,
} from './modules';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

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
    AcademicModule,
    AdminModule,
    CoursesModule,
    CourseTemplatesModule,
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
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
