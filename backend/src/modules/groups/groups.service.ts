import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignStudentsDto,
  CreateGroupDto,
  GroupsQueryDto,
  UpdateGroupDto,
} from './dto';

/** CRUD групп, привязка студентов к группам. */
@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: number, query: GroupsQueryDto) {
    const where: Prisma.GroupWhereInput = {
      tenantId,
      courseYear: query.courseYear,
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                direction: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };
    const [groups, total] = await this.prisma.$transaction([
      this.prisma.group.findMany({
        where,
        include: { _count: { select: { userGroups: true } } },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.group.count({ where }),
    ]);

    return {
      items: groups.map(({ _count, ...group }) => ({
        ...group,
        studentCount: _count.userGroups,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  findOne(groupId: number, tenantId: number) {
    return this.findGroupDetail(groupId, tenantId);
  }

  async create(tenantId: number, dto: CreateGroupDto) {
    try {
      const group = await this.prisma.group.create({
        data: { tenantId, ...dto },
      });
      return { ...group, studentCount: 0, students: [] };
    } catch (error) {
      this.rethrowGroupWriteError(error);
    }
  }

  async update(groupId: number, tenantId: number, dto: UpdateGroupDto) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('No group changes provided');
    }

    await this.findTenantGroup(groupId, tenantId);
    try {
      await this.prisma.group.update({
        where: { id: groupId },
        data: dto,
      });
      return this.findGroupDetail(groupId, tenantId);
    } catch (error) {
      this.rethrowGroupWriteError(error);
    }
  }

  async remove(groupId: number, tenantId: number) {
    const group = await this.findGroupDetail(groupId, tenantId);
    await this.prisma.group.delete({ where: { id: groupId } });
    return group;
  }

  async assignStudents(
    groupId: number,
    tenantId: number,
    dto: AssignStudentsDto,
  ) {
    await this.findTenantGroup(groupId, tenantId);
    const studentCount = await this.prisma.user.count({
      where: {
        id: { in: dto.studentIds },
        tenantId,
        role: UserRole.student,
        isActive: true,
      },
    });
    if (studentCount !== dto.studentIds.length) {
      throw new BadRequestException(
        'Every student must be active, have the student role and belong to this tenant',
      );
    }

    await this.prisma.userGroup.createMany({
      data: dto.studentIds.map((userId) => ({ userId, groupId })),
      skipDuplicates: true,
    });
    return this.findGroupDetail(groupId, tenantId);
  }

  async removeStudent(groupId: number, studentId: number, tenantId: number) {
    await this.findTenantGroup(groupId, tenantId);
    const deleted = await this.prisma.userGroup.deleteMany({
      where: { groupId, userId: studentId },
    });
    if (deleted.count !== 1) {
      throw new NotFoundException('Student is not assigned to this group');
    }

    return this.findGroupDetail(groupId, tenantId);
  }

  private async findTenantGroup(groupId: number, tenantId: number) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, tenantId },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  private async findGroupDetail(groupId: number, tenantId: number) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, tenantId },
      include: {
        userGroups: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const { userGroups, ...groupData } = group;
    const students = userGroups
      .map(({ user }) => user)
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
    return {
      ...groupData,
      studentCount: students.length,
      students,
    };
  }

  private rethrowGroupWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Group name already exists in this tenant');
    }
    throw error;
  }
}
