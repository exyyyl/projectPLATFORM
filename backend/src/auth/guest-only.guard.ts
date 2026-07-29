import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { TokenPayload } from './interfaces/token-payload';

@Injectable()
export class GuestOnlyGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      cookies?: Record<string, string>;
    }>();
    const authorization = request.headers.authorization;

    if (!authorization) {
      const hasRefreshSession = await this.auth.hasActiveRefreshSession(
        request.cookies?.refreshToken ?? '',
      );
      if (hasRefreshSession) {
        throw new ForbiddenException(
          'This endpoint is available only to unauthenticated users',
        );
      }

      return true;
    }

    const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token);
      if (payload.tokenType !== 'access') {
        throw new UnauthorizedException('Invalid access token');
      }
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    throw new ForbiddenException(
      'This endpoint is available only to unauthenticated users',
    );
  }
}
