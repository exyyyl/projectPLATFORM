import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

  /** Список пользователей без password_hash (для admin). */
  findAll() {
    return this.prisma.user.findMany({
      select: userPublicSelect,
      orderBy: { id: 'asc' },
    });
  }
}
