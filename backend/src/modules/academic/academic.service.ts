import { Injectable } from '@nestjs/common';
import { CourseStatus, UserRole } from '@prisma/client';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  getOverview(user: JwtPayload) {
    switch (user.role) {
      case UserRole.student:
        return this.getStudentOverview(user.id, user.tenantId);
      case UserRole.teacher:
        return this.getTeacherOverview(user.id, user.tenantId);
      case UserRole.admin:
        return this.getAdminOverview(user.tenantId);
      case UserRole.superadmin:
        return this.getSuperadminOverview();
    }
  }

  private async getStudentOverview(userId: number, tenantId: number) {
    const memberships = await this.prisma.userGroup.findMany({
      where: { userId, group: { tenantId } },
      include: {
        group: {
          include: {
            teachingAssignments: {
              include: {
                discipline: true,
                teacher: {
                  select: { id: true, fullName: true, email: true },
                },
                courseGroups: {
                  where: { course: { status: CourseStatus.published } },
                  include: {
                    course: {
                      select: {
                        id: true,
                        title: true,
                        description: true,
                        status: true,
                        updatedAt: true,
                      },
                    },
                  },
                },
              },
              orderBy: { id: 'asc' },
            },
          },
        },
      },
      orderBy: { group: { name: 'asc' } },
    });

    return {
      role: UserRole.student,
      groups: memberships.map(({ group }) => ({
        id: group.id,
        name: group.name,
        courseYear: group.courseYear,
        direction: group.direction,
        disciplines: group.teachingAssignments.map((assignment) => ({
          teachingAssignmentId: assignment.id,
          discipline: assignment.discipline,
          teacher: assignment.teacher,
          courses: assignment.courseGroups.map(({ course }) => course),
        })),
      })),
    };
  }

  private async getTeacherOverview(userId: number, tenantId: number) {
    const assignments = await this.prisma.teachingAssignment.findMany({
      where: { teacherId: userId, discipline: { tenantId } },
      include: {
        discipline: true,
        group: true,
        courseGroups: {
          include: {
            course: {
              select: { id: true, title: true, status: true, updatedAt: true },
            },
          },
        },
      },
      orderBy: [{ discipline: { name: 'asc' } }, { group: { name: 'asc' } }],
    });
    const disciplines = new Map<
      number,
      {
        id: number;
        name: string;
        description: string | null;
        groups: Array<{
          teachingAssignmentId: number;
          id: number;
          name: string;
          courseYear: number | null;
          direction: string | null;
          courses: Array<{
            id: number;
            title: string;
            status: CourseStatus;
            updatedAt: Date;
          }>;
        }>;
      }
    >();

    for (const assignment of assignments) {
      const discipline = disciplines.get(assignment.disciplineId) ?? {
        id: assignment.discipline.id,
        name: assignment.discipline.name,
        description: assignment.discipline.description,
        groups: [],
      };
      discipline.groups.push({
        teachingAssignmentId: assignment.id,
        id: assignment.group.id,
        name: assignment.group.name,
        courseYear: assignment.group.courseYear,
        direction: assignment.group.direction,
        courses: assignment.courseGroups.map(({ course }) => course),
      });
      disciplines.set(assignment.disciplineId, discipline);
    }

    return {
      role: UserRole.teacher,
      disciplines: [...disciplines.values()],
    };
  }

  private async getAdminOverview(tenantId: number) {
    const [users, groups, disciplines, teachingAssignments, courses] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.group.count({ where: { tenantId } }),
        this.prisma.discipline.count({ where: { tenantId } }),
        this.prisma.teachingAssignment.count({
          where: { discipline: { tenantId } },
        }),
        this.prisma.course.count({ where: { discipline: { tenantId } } }),
      ]);
    return {
      role: UserRole.admin,
      summary: { users, groups, disciplines, teachingAssignments, courses },
    };
  }

  private async getSuperadminOverview() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true, groups: true, disciplines: true, news: true },
        },
      },
      orderBy: { id: 'asc' },
    });
    return {
      role: UserRole.superadmin,
      tenants: tenants.map(({ _count, ...tenant }) => ({
        ...tenant,
        counts: _count,
      })),
    };
  }
}
