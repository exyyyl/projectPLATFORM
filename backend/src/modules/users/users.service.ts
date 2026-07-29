import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto';

const userPublicSelect = {
  id: true,
  tenantId: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Профиль, смена пароля, CRUD пользователя (для admin). */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findProfile(userId: number, tenantId: number) {
    return this.findActiveUser(userId, tenantId);
  }

  async updateProfile(userId: number, tenantId: number, dto: UpdateProfileDto) {
    const changes: { fullName?: string; passwordHash?: string } = {};
    const wantsPasswordChange =
      dto.currentPassword !== undefined || dto.newPassword !== undefined;

    if (dto.fullName !== undefined) {
      changes.fullName = dto.fullName;
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
      select: {
        ...userPublicSelect,
        passwordHash: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User account is unavailable');
    }

    if (wantsPasswordChange) {
      if (!dto.currentPassword || !dto.newPassword) {
        throw new BadRequestException(
          'currentPassword and newPassword must be provided together',
        );
      }

      const currentPasswordIsValid = await bcrypt.compare(
        dto.currentPassword,
        user.passwordHash,
      );
      if (!currentPasswordIsValid) {
        throw new UnauthorizedException('Current password is invalid');
      }

      changes.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('No profile changes provided');
    }

    const updateUser = this.prisma.user.update({
      where: { id: user.id },
      data: changes,
      select: userPublicSelect,
    });

    if (changes.passwordHash === undefined) {
      return updateUser;
    }

    const [updatedUser] = await this.prisma.$transaction([
      updateUser,
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);
    return updatedUser;
  }

  /** Список пользователей без password_hash (для admin). */
  findAll(tenantId: number) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: userPublicSelect,
      orderBy: { id: 'asc' },
    });
  }

  private async findActiveUser(userId: number, tenantId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
      select: userPublicSelect,
    });
    if (!user) {
      throw new UnauthorizedException('User account is unavailable');
    }

    return user;
  }
}
