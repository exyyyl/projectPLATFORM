import { Module } from '@nestjs/common';
import { DisciplinesModule } from '../disciplines/disciplines.module';
import { GroupsModule } from '../groups/groups.module';
import { UsersModule } from '../users/users.module';
import { AdminDisciplinesController } from './admin-disciplines.controller';
import { AdminGroupsController } from './admin-groups.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [UsersModule, GroupsModule, DisciplinesModule],
  controllers: [
    AdminUsersController,
    AdminGroupsController,
    AdminDisciplinesController,
  ],
})
export class AdminModule {}
