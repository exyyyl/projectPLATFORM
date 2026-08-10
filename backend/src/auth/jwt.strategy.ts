import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TokenPayload } from './interfaces/token-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: TokenPayload): Promise<JwtPayload> {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        isActive: true,
        tenant: { isActive: true },
      },
      select: { id: true, email: true, role: true, tenantId: true },
    });
    if (!user) {
      throw new UnauthorizedException('User account is unavailable');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
  }
}
