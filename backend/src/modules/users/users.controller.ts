import { Controller, Get, Put } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile() {
    return { message: 'TODO: GET /users/me' };
  }

  @Put('me')
  updateProfile() {
    return { message: 'TODO: PUT /users/me' };
  }
}
