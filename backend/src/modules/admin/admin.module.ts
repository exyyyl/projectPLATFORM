import { Module } from '@nestjs/common';
import { DisciplinesModule } from '../disciplines/disciplines.module';
import { GroupsModule } from '../groups/groups.module';
import { NewsModule } from '../news/news.module';
import { UsersModule } from '../users/users.module';
import { AdminDisciplinesController } from './admin-disciplines.controller';
import { AdminGroupsController } from './admin-groups.controller';
import { AdminNewsController } from './admin-news.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [UsersModule, GroupsModule, DisciplinesModule, NewsModule],
  controllers: [
    AdminUsersController,
    AdminGroupsController,
    AdminDisciplinesController,
    AdminNewsController,
  ],
})
export class AdminModule {}
