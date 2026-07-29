import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import { TokenPayload } from './interfaces/token-payload';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

type TokenUser = Pick<User, 'id' | 'tenantId' | 'email' | 'role'>;

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: StringValue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.refreshExpiresIn = this.config.get<string>(
      'JWT_REFRESH_TTL',
      '7d',
    ) as StringValue;
  }

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const tenant = await this.prisma.tenant.findFirst();
    if (!tenant) {
      throw new ConflictException('No tenant configured. Run prisma db seed.');
    }

    const existing = await this.prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId: tenant.id, email: dto.email },
      },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email,
        fullName: dto.name?.trim() || dto.email,
        passwordHash,
        role: UserRole.student,
      },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException();
      }

      const tokenHash = this.hashRefreshToken(refreshToken);
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          userId: payload.sub,
          tokenHash,
          expiresAt: { gt: new Date() },
        },
      });
      if (!storedToken) {
        throw new UnauthorizedException();
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }

      const deleted = await this.prisma.refreshToken.deleteMany({
        where: {
          id: storedToken.id,
          tokenHash,
        },
      });
      if (deleted.count !== 1) {
        throw new UnauthorizedException();
      }

      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async hasActiveRefreshSession(refreshToken: string): Promise<boolean> {
    if (!refreshToken) {
      return false;
    }

    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
      if (payload.tokenType !== 'refresh') {
        return false;
      }

      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          userId: payload.sub,
          tokenHash: this.hashRefreshToken(refreshToken),
          expiresAt: { gt: new Date() },
          user: { isActive: true },
        },
      });

      return storedToken !== null;
    } catch {
      return false;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.prisma.refreshToken.deleteMany({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
      },
    });
  }

  private async issueTokens(user: TokenUser): Promise<AuthTokens> {
    const basePayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({
        ...basePayload,
        tokenType: 'access',
        jti: randomUUID(),
      } satisfies TokenPayload),
      this.jwt.signAsync(
        {
          ...basePayload,
          tokenType: 'refresh',
          jti: randomUUID(),
        } satisfies TokenPayload,
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshExpiresIn,
        },
      ),
    ]);

    const decoded = this.jwt.decode<{ exp?: number }>(refreshToken);
    if (!decoded?.exp) {
      throw new UnauthorizedException('Refresh token has no expiration');
    }

    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lte: new Date() },
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashRefreshToken(refreshToken),
          expiresAt: new Date(decoded.exp * 1000),
        },
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}
