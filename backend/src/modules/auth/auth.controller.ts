import { Controller, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login() {
    return { message: 'TODO: POST /auth/login' };
  }

  @Public()
  @Post('refresh')
  refresh() {
    return { message: 'TODO: POST /auth/refresh' };
  }

  @Post('logout')
  logout() {
    return { message: 'TODO: POST /auth/logout' };
  }
}
