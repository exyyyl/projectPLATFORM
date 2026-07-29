/**
 * Учебный пример централизованной группировки маршрутов NestJS.
 *
 * Этот файл намеренно не подключён к AppModule и не влияет на приложение.
 * RouterModule задаёт префиксы МОДУЛЕЙ, но HTTP-методы и конечные пути
 * по-прежнему объявляются декораторами в контроллерах.
 *
 * Перед реальным подключением контроллеры внутри перечисленных модулей
 * должны использовать относительные пути:
 *
 *   @Controller()                 // префикс приходит отсюда
 *   @Get()                        // GET /courses
 *   @Get(':id')                   // GET /courses/:id
 *
 * Иначе текущий @Controller('courses') вместе с path: 'courses'
 * создаст дублированный URL /courses/courses.
 */
import type { Routes } from '@nestjs/core';
import { AuthModule } from '../../src/auth/auth.module';
import { AdminModule } from '../../src/modules/admin/admin.module';
import { AssignmentsModule } from '../../src/modules/assignments/assignments.module';
import { CoursesModule } from '../../src/modules/courses/courses.module';
import { NewsModule } from '../../src/modules/news/news.module';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';
import { UsersModule } from '../../src/modules/users/users.module';

export const apiRoutes: Routes = [
  {
    path: 'auth',
    module: AuthModule,
  },
  {
    path: 'users',
    module: UsersModule,
  },
  {
    path: 'courses',
    module: CoursesModule,
  },
  {
    path: 'assignments',
    module: AssignmentsModule,
  },
  {
    path: 'notifications',
    module: NotificationsModule,
  },
  {
    path: 'news',
    module: NewsModule,
  },
  {
    path: 'admin',
    module: AdminModule,
  },
];
