import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignGroupsDto,
  AssignTeachersDto,
  CreateDisciplineDto,
  CreateTeachingAssignmentDto,
  DisciplinesQueryDto,
  UpdateDisciplineDto,
} from './dto';

const teacherPublicSelect = {
  id: true,
  email: true,
  fullName: true,
  isActive: true,
} as const;

const groupPublicSelect = {
  id: true,
  name: true,
  courseYear: true,
  direction: true,
} as const;

/** Справочник дисциплин, привязка преподавателей и групп. */
@Injectable()
export class DisciplinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: number, query: DisciplinesQueryDto) {
    const where: Prisma.DisciplineWhereInput = {
      tenantId,
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
                description: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };
    const [disciplines, total] = await this.prisma.$transaction([
      this.prisma.discipline.findMany({
        where,
        include: {
          _count: {
            select: {
              disciplineTeachers: true,
              disciplineGroups: true,
              teachingAssignments: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.discipline.count({ where }),
    ]);

    return {
      items: disciplines.map(({ _count, ...discipline }) => ({
        ...discipline,
        teacherCount: _count.disciplineTeachers,
        groupCount: _count.disciplineGroups,
        teachingAssignmentCount: _count.teachingAssignments,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  findOne(disciplineId: number, tenantId: number) {
    return this.findDisciplineDetail(disciplineId, tenantId);
  }

  async create(tenantId: number, dto: CreateDisciplineDto) {
    try {
      const discipline = await this.prisma.discipline.create({
        data: { tenantId, ...dto },
      });
      return {
        ...discipline,
        teacherCount: 0,
        groupCount: 0,
        teachingAssignmentCount: 0,
        teachers: [],
        groups: [],
        teachingAssignments: [],
      };
    } catch (error) {
      this.rethrowDisciplineWriteError(error);
    }
  }

  async update(
    disciplineId: number,
    tenantId: number,
    dto: UpdateDisciplineDto,
  ) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('No discipline changes provided');
    }

    await this.findTenantDiscipline(disciplineId, tenantId);
    try {
      await this.prisma.discipline.update({
        where: { id: disciplineId },
        data: dto,
      });
      return this.findDisciplineDetail(disciplineId, tenantId);
    } catch (error) {
      this.rethrowDisciplineWriteError(error);
    }
  }

  async remove(disciplineId: number, tenantId: number) {
    const discipline = await this.findDisciplineDetail(disciplineId, tenantId);
    const courseCount = await this.prisma.course.count({
      where: { disciplineId },
    });
    if (courseCount > 0) {
      throw new ConflictException(
        'A discipline with courses cannot be deleted',
      );
    }

    await this.prisma.discipline.delete({ where: { id: disciplineId } });
    return discipline;
  }

  async assignTeachers(
    disciplineId: number,
    tenantId: number,
    dto: AssignTeachersDto,
  ) {
    await this.findTenantDiscipline(disciplineId, tenantId);
    await this.ensureTeachers(dto.teacherIds, tenantId);
    await this.prisma.disciplineTeacher.createMany({
      data: dto.teacherIds.map((userId) => ({ disciplineId, userId })),
      skipDuplicates: true,
    });
    return this.findDisciplineDetail(disciplineId, tenantId);
  }

  async removeTeacher(
    disciplineId: number,
    teacherId: number,
    tenantId: number,
  ) {
    await this.findTenantDiscipline(disciplineId, tenantId);
    const [, relation] = await this.prisma.$transaction([
      this.prisma.teachingAssignment.deleteMany({
        where: { disciplineId, teacherId },
      }),
      this.prisma.disciplineTeacher.deleteMany({
        where: { disciplineId, userId: teacherId },
      }),
    ]);
    if (relation.count !== 1) {
      throw new NotFoundException('Teacher is not assigned to this discipline');
    }
    return this.findDisciplineDetail(disciplineId, tenantId);
  }

  async assignGroups(
    disciplineId: number,
    tenantId: number,
    dto: AssignGroupsDto,
  ) {
    await this.findTenantDiscipline(disciplineId, tenantId);
    await this.ensureGroups(dto.groupIds, tenantId);
    await this.prisma.disciplineGroup.createMany({
      data: dto.groupIds.map((groupId) => ({ disciplineId, groupId })),
      skipDuplicates: true,
    });
    return this.findDisciplineDetail(disciplineId, tenantId);
  }

  async removeGroup(disciplineId: number, groupId: number, tenantId: number) {
    await this.findTenantDiscipline(disciplineId, tenantId);
    const [, relation] = await this.prisma.$transaction([
      this.prisma.teachingAssignment.deleteMany({
        where: { disciplineId, groupId },
      }),
      this.prisma.disciplineGroup.deleteMany({
        where: { disciplineId, groupId },
      }),
    ]);
    if (relation.count !== 1) {
      throw new NotFoundException('Group is not assigned to this discipline');
    }
    return this.findDisciplineDetail(disciplineId, tenantId);
  }

  async createTeachingAssignment(
    disciplineId: number,
    tenantId: number,
    dto: CreateTeachingAssignmentDto,
  ) {
    await Promise.all([
      this.findTenantDiscipline(disciplineId, tenantId),
      this.ensureTeachers([dto.teacherId], tenantId),
      this.ensureGroups([dto.groupId], tenantId),
    ]);

    const [teacherRelation, groupRelation] = await Promise.all([
      this.prisma.disciplineTeacher.findUnique({
        where: {
          disciplineId_userId: {
            disciplineId,
            userId: dto.teacherId,
          },
        },
      }),
      this.prisma.disciplineGroup.findUnique({
        where: {
          disciplineId_groupId: {
            disciplineId,
            groupId: dto.groupId,
          },
        },
      }),
    ]);
    if (!teacherRelation || !groupRelation) {
      throw new ConflictException(
        'Teacher and group must be assigned to the discipline first',
      );
    }

    try {
      return await this.prisma.teachingAssignment.create({
        data: {
          disciplineId,
          teacherId: dto.teacherId,
          groupId: dto.groupId,
        },
        include: {
          teacher: { select: teacherPublicSelect },
          group: { select: groupPublicSelect },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Teaching assignment already exists');
      }
      throw error;
    }
  }

  async removeTeachingAssignment(
    disciplineId: number,
    assignmentId: number,
    tenantId: number,
  ) {
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: {
        id: assignmentId,
        disciplineId,
        discipline: { tenantId },
      },
      include: {
        teacher: { select: teacherPublicSelect },
        group: { select: groupPublicSelect },
      },
    });
    if (!assignment) {
      throw new NotFoundException('Teaching assignment not found');
    }

    await this.prisma.teachingAssignment.delete({
      where: { id: assignmentId },
    });
    return assignment;
  }

  private async ensureTeachers(teacherIds: number[], tenantId: number) {
    const count = await this.prisma.user.count({
      where: {
        id: { in: teacherIds },
        tenantId,
        role: UserRole.teacher,
        isActive: true,
      },
    });
    if (count !== teacherIds.length) {
      throw new BadRequestException(
        'Every teacher must be active, have the teacher role and belong to this tenant',
      );
    }
  }

  private async ensureGroups(groupIds: number[], tenantId: number) {
    const count = await this.prisma.group.count({
      where: { id: { in: groupIds }, tenantId },
    });
    if (count !== groupIds.length) {
      throw new BadRequestException('Every group must belong to this tenant');
    }
  }

  private async findTenantDiscipline(disciplineId: number, tenantId: number) {
    const discipline = await this.prisma.discipline.findFirst({
      where: { id: disciplineId, tenantId },
    });
    if (!discipline) {
      throw new NotFoundException('Discipline not found');
    }
    return discipline;
  }

  private async findDisciplineDetail(disciplineId: number, tenantId: number) {
    const discipline = await this.prisma.discipline.findFirst({
      where: { id: disciplineId, tenantId },
      include: {
        disciplineTeachers: {
          select: { teacher: { select: teacherPublicSelect } },
        },
        disciplineGroups: {
          select: { group: { select: groupPublicSelect } },
        },
        teachingAssignments: {
          include: {
            teacher: { select: teacherPublicSelect },
            group: { select: groupPublicSelect },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!discipline) {
      throw new NotFoundException('Discipline not found');
    }

    const {
      disciplineTeachers,
      disciplineGroups,
      teachingAssignments,
      ...disciplineData
    } = discipline;
    const teachers = disciplineTeachers
      .map(({ teacher }) => teacher)
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
    const groups = disciplineGroups
      .map(({ group }) => group)
      .sort((left, right) => left.name.localeCompare(right.name));
    return {
      ...disciplineData,
      teacherCount: teachers.length,
      groupCount: groups.length,
      teachingAssignmentCount: teachingAssignments.length,
      teachers,
      groups,
      teachingAssignments,
    };
  }

  private rethrowDisciplineWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Discipline name already exists in this tenant',
      );
    }
    throw error;
  }
}
