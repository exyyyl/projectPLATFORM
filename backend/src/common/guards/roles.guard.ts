import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RBAC: student | teacher | admin. Superadmin bypasses tenant role checks.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (
      !user ||
      (user.role !== UserRole.superadmin && !requiredRoles.includes(user.role))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
