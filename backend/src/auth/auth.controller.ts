import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { GuestOnlyGuard } from './guest-only.guard';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(GuestOnlyGuard)
  @Post('register')
  @ApiOperation({ summary: 'Register a new guest user' })
  @ApiCreatedResponse({
    description: 'User created; refresh token is set in an HttpOnly cookie',
    schema: { example: { accessToken: '<jwt>' } },
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({ description: 'Invalid Authorization header' })
  @ApiForbiddenResponse({ description: 'User already has an active session' })
  @ApiConflictResponse({ description: 'Email already exists' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.register(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(GuestOnlyGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login as a guest' })
  @ApiCreatedResponse({
    description: 'Authenticated; refresh token is set in an HttpOnly cookie',
    schema: { example: { accessToken: '<jwt>' } },
  })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or Authorization header',
  })
  @ApiForbiddenResponse({ description: 'User already has an active session' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue a new token pair' })
  @ApiCookieAuth()
  @ApiCreatedResponse({
    description: 'Token pair rotated and a new refresh cookie set',
    schema: { example: { accessToken: '<new-jwt>' } },
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is missing or invalid',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.refreshTokens(this.getRefreshToken(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke refresh token and clear its cookie' })
  @ApiCookieAuth()
  @ApiCreatedResponse({
    schema: { example: { message: 'Logged out' } },
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(this.getRefreshToken(req));
    res.clearCookie('refreshToken', { path: '/' });
    return { message: 'Logged out' };
  }

  private getRefreshToken(req: Request): string {
    return (
      (req.cookies as Record<string, string> | undefined)?.refreshToken ?? ''
    );
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
