import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminUsersQueryDto,
  CreateAdminUserDto,
  UpdateAdminUserDto,
  UpdateProfileDto,
} from './dto';

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

  async findAll(tenantId: number, query: AdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      tenantId,
      role: query.role,
      isActive:
        query.isActive === undefined
          ? undefined
          : query.isActive === 'true' || query.isActive === '1',
      ...(query.search
        ? {
            OR: [
              {
                email: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                fullName: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy: { id: 'asc' },
        skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  findOneForAdmin(userId: number, tenantId: number) {
    return this.findTenantUser(userId, tenantId);
  }

  async createForAdmin(
    tenantId: number,
    actorRole: UserRole,
    dto: CreateAdminUserDto,
  ) {
    if (dto.role === UserRole.superadmin && actorRole !== UserRole.superadmin) {
      throw new ForbiddenException('Only a superadmin can create a superadmin');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      return await this.prisma.user.create({
        data: {
          tenantId,
          email: dto.email,
          fullName: dto.fullName,
          passwordHash,
          role: dto.role,
          isActive: dto.isActive ?? true,
        },
        select: userPublicSelect,
      });
    } catch (error) {
      this.rethrowUserWriteError(error);
    }
  }

  async updateForAdmin(
    userId: number,
    tenantId: number,
    actorUserId: number,
    actorRole: UserRole,
    dto: UpdateAdminUserDto,
  ) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('No user changes provided');
    }
    if (userId === actorUserId && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    if (
      userId === actorUserId &&
      dto.role !== undefined &&
      dto.role !== actorRole
    ) {
      throw new BadRequestException('You cannot remove your own admin role');
    }

    if (dto.role === UserRole.superadmin && actorRole !== UserRole.superadmin) {
      throw new ForbiddenException('Only a superadmin can grant this role');
    }

    const targetUser = await this.findTenantUser(userId, tenantId);
    if (
      targetUser.role === UserRole.superadmin &&
      actorRole !== UserRole.superadmin
    ) {
      throw new ForbiddenException('Only a superadmin can edit a superadmin');
    }

    const changes: {
      email?: string;
      fullName?: string;
      passwordHash?: string;
      role?: UserRole;
      isActive?: boolean;
    } = {
      email: dto.email,
      fullName: dto.fullName,
      role: dto.role,
      isActive: dto.isActive,
    };
    if (dto.password !== undefined) {
      changes.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const updateUser = this.prisma.user.update({
      where: { id: userId },
      data: changes,
      select: userPublicSelect,
    });
    const shouldRevokeSessions =
      dto.password !== undefined ||
      dto.email !== undefined ||
      dto.role !== undefined ||
      dto.isActive === false;

    try {
      if (!shouldRevokeSessions) {
        return await updateUser;
      }

      const [updatedUser] = await this.prisma.$transaction([
        updateUser,
        this.prisma.refreshToken.deleteMany({ where: { userId } }),
      ]);
      return updatedUser;
    } catch (error) {
      this.rethrowUserWriteError(error);
    }
  }

  async deactivateForAdmin(
    userId: number,
    tenantId: number,
    actorUserId: number,
    actorRole: UserRole,
  ) {
    if (userId === actorUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const targetUser = await this.findTenantUser(userId, tenantId);
    if (
      targetUser.role === UserRole.superadmin &&
      actorRole !== UserRole.superadmin
    ) {
      throw new ForbiddenException(
        'Only a superadmin can deactivate a superadmin',
      );
    }
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: userPublicSelect,
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);
    return user;
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

  private async findTenantUser(userId: number, tenantId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: userPublicSelect,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private rethrowUserWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email already exists in this tenant');
    }

    throw error;
  }
}
