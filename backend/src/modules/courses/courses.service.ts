import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentStatus,
  CourseStatus,
  GradeResult,
  GradingType,
  MaterialReleaseStatus,
  MaterialType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AssignCourseGroupsDto,
  CreateCourseBlockDto,
  CreateCourseDto,
  CreateMaterialDto,
  SetMaterialReleaseDto,
  UpdateCourseDto,
  UpdateCourseBlockDto,
  UpdateMaterialDto,
} from './dto';

const courseListInclude = {
  template: { select: { id: true, title: true, version: true } },
  discipline: { select: { id: true, name: true, description: true } },
  teacher: { select: { id: true, fullName: true, email: true } },
  _count: {
    select: { courseGroups: true, materials: true, assignments: true },
  },
} as const;

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(user: JwtPayload) {
    const where: Prisma.CourseWhereInput =
      user.role === UserRole.superadmin
        ? {}
        : user.role === UserRole.admin
          ? { discipline: { tenantId: user.tenantId } }
          : user.role === UserRole.teacher
            ? { teacherId: user.id }
            : {
                status: CourseStatus.published,
                courseGroups: {
                  some: {
                    teachingAssignment: {
                      group: { userGroups: { some: { userId: user.id } } },
                    },
                  },
                },
              };
    const courses = await this.prisma.course.findMany({
      where,
      include: courseListInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return courses.map(({ _count, ...course }) => ({
      ...course,
      groupCount: _count.courseGroups,
      materialCount: _count.materials,
      assignmentCount: _count.assignments,
    }));
  }

  async findOne(courseId: number, user: JwtPayload) {
    const course = await this.findAccessibleCourse(courseId, user);
    if (user.role !== UserRole.student) {
      return course;
    }

    const ownCourseGroupIds = new Set(
      course.courseGroups
        .filter((courseGroup) =>
          courseGroup.teachingAssignment.group.userGroups.some(
            ({ userId }) => userId === user.id,
          ),
        )
        .map(({ id }) => id),
    );
    const now = new Date();
    return {
      ...course,
      courseGroups: course.courseGroups.filter(({ id }) =>
        ownCourseGroupIds.has(id),
      ),
      materials: course.materials
        .filter((material) =>
          material.releases.some(
            (release) =>
              ownCourseGroupIds.has(release.courseGroupId) &&
              (release.status === MaterialReleaseStatus.published ||
                (release.status === MaterialReleaseStatus.scheduled &&
                  release.scheduledAt !== null &&
                  release.scheduledAt <= now)),
          ),
        )
        .map((material) => {
          const { releases, ...visibleMaterial } = material;
          void releases;
          return visibleMaterial;
        }),
      assignments: course.assignments.filter(
        ({ status }) => status !== AssignmentStatus.draft,
      ),
    };
  }

  async create(user: JwtPayload, dto: CreateCourseDto) {
    const discipline = await this.prisma.discipline.findUnique({
      where: { id: dto.disciplineId },
    });
    if (!discipline) {
      throw new NotFoundException('Discipline not found');
    }
    if (
      user.role !== UserRole.superadmin &&
      discipline.tenantId !== user.tenantId
    ) {
      throw new ForbiddenException('Discipline belongs to another tenant');
    }

    const teacherId =
      user.role === UserRole.teacher ? user.id : (dto.teacherId ?? 0);
    if (!teacherId) {
      throw new BadRequestException('teacherId is required for an admin');
    }
    if (
      user.role === UserRole.teacher &&
      dto.teacherId &&
      dto.teacherId !== user.id
    ) {
      throw new ForbiddenException(
        'A teacher can create only their own course',
      );
    }

    const assignedTeacher = await this.prisma.disciplineTeacher.findFirst({
      where: {
        disciplineId: discipline.id,
        userId: teacherId,
        teacher: {
          tenantId: discipline.tenantId,
          role: UserRole.teacher,
          isActive: true,
        },
      },
    });
    if (!assignedTeacher) {
      throw new ConflictException(
        'Teacher must be assigned to the discipline first',
      );
    }

    return this.prisma.course.create({
      data: {
        disciplineId: discipline.id,
        teacherId,
        title: dto.title,
        description: dto.description ?? '',
      },
      include: courseListInclude,
    });
  }

  async update(courseId: number, user: JwtPayload, dto: UpdateCourseDto) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('No course changes provided');
    }
    await this.ensureMutableCourse(courseId, user);
    await this.prisma.course.update({ where: { id: courseId }, data: dto });
    return this.findOne(courseId, user);
  }

  async publish(courseId: number, user: JwtPayload) {
    await this.ensureMutableCourse(courseId, user);
    await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.published },
    });
    return this.findOne(courseId, user);
  }

  async unpublish(courseId: number, user: JwtPayload) {
    await this.ensureMutableCourse(courseId, user);
    await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.draft },
    });
    return this.findOne(courseId, user);
  }

  async assignGroups(
    courseId: number,
    user: JwtPayload,
    dto: AssignCourseGroupsDto,
  ) {
    const course = await this.ensureMutableCourse(courseId, user);
    const assignmentIds = [...new Set(dto.teachingAssignmentIds)];
    const assignments = await this.prisma.teachingAssignment.findMany({
      where: {
        id: { in: assignmentIds },
        discipline: { tenantId: course.discipline.tenantId },
        group: { tenantId: course.discipline.tenantId },
      },
    });
    if (
      assignments.length !== assignmentIds.length ||
      assignments.some(
        (assignment) =>
          assignment.teacherId !== course.teacherId ||
          assignment.disciplineId !== course.disciplineId,
      )
    ) {
      throw new ConflictException(
        'Every group assignment must match the course teacher and discipline',
      );
    }

    await this.prisma.courseGroup.createMany({
      data: assignmentIds.map((teachingAssignmentId) => ({
        courseId,
        teachingAssignmentId,
      })),
      skipDuplicates: true,
    });
    const [courseGroups, materials] = await Promise.all([
      this.prisma.courseGroup.findMany({
        where: { courseId, teachingAssignmentId: { in: assignmentIds } },
      }),
      this.prisma.material.findMany({ where: { courseId } }),
    ]);
    if (courseGroups.length && materials.length) {
      await this.prisma.materialRelease.createMany({
        data: courseGroups.flatMap((courseGroup) =>
          materials.map((material) => ({
            materialId: material.id,
            courseGroupId: courseGroup.id,
            status: material.defaultAvailableAt
              ? MaterialReleaseStatus.scheduled
              : MaterialReleaseStatus.draft,
            scheduledAt: material.defaultAvailableAt,
          })),
        ),
        skipDuplicates: true,
      });
    }
    return this.findOne(courseId, user);
  }

  async removeGroup(courseId: number, courseGroupId: number, user: JwtPayload) {
    await this.ensureMutableCourse(courseId, user);
    const deleted = await this.prisma.courseGroup.deleteMany({
      where: { id: courseGroupId, courseId },
    });
    if (deleted.count !== 1) {
      throw new NotFoundException('Course group not found');
    }
    return this.findOne(courseId, user);
  }

  async createMaterial(
    courseId: number,
    user: JwtPayload,
    dto: CreateMaterialDto,
  ) {
    await this.ensureMutableCourse(courseId, user);
    this.validateMaterialLocation(dto.type, dto.url, dto.filePath);
    if (dto.blockId) {
      await this.ensureCourseBlock(dto.blockId, courseId);
    }
    const defaultAvailableAt = dto.defaultAvailableAt
      ? new Date(dto.defaultAvailableAt)
      : null;
    const material = await this.prisma.material.create({
      data: {
        courseId,
        blockId: dto.blockId,
        title: dto.title,
        type: dto.type,
        url: dto.url,
        filePath: dto.filePath,
        uploadedBy: user.id,
        defaultAvailableAt,
      },
    });
    const courseGroups = await this.prisma.courseGroup.findMany({
      where: { courseId },
    });
    if (courseGroups.length) {
      await this.prisma.materialRelease.createMany({
        data: courseGroups.map((courseGroup) => ({
          materialId: material.id,
          courseGroupId: courseGroup.id,
          status: defaultAvailableAt
            ? MaterialReleaseStatus.scheduled
            : MaterialReleaseStatus.draft,
          scheduledAt: defaultAvailableAt,
        })),
      });
    }
    return this.findMaterial(material.id, courseId);
  }

  async updateMaterial(
    courseId: number,
    materialId: number,
    user: JwtPayload,
    dto: UpdateMaterialDto,
  ) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('No material changes provided');
    }
    await this.ensureMutableCourse(courseId, user);
    const existing = await this.findMaterial(materialId, courseId);
    const type = dto.type ?? existing.type;
    const url = dto.url === undefined ? existing.url : dto.url;
    const filePath =
      dto.filePath === undefined ? existing.filePath : dto.filePath;
    this.validateMaterialLocation(type, url, filePath);
    const defaultAvailableAt =
      dto.defaultAvailableAt === undefined
        ? existing.defaultAvailableAt
        : dto.defaultAvailableAt
          ? new Date(dto.defaultAvailableAt)
          : null;

    await this.prisma.$transaction([
      this.prisma.material.update({
        where: { id: materialId },
        data: {
          title: dto.title,
          type: dto.type,
          url: dto.url,
          filePath: dto.filePath,
          ...(dto.defaultAvailableAt !== undefined
            ? { defaultAvailableAt }
            : {}),
        },
      }),
      ...(dto.defaultAvailableAt !== undefined
        ? [
            this.prisma.materialRelease.updateMany({
              where: {
                materialId,
                isOverridden: false,
                status: { not: MaterialReleaseStatus.published },
              },
              data: {
                status: defaultAvailableAt
                  ? MaterialReleaseStatus.scheduled
                  : MaterialReleaseStatus.draft,
                scheduledAt: defaultAvailableAt,
                publishedAt: null,
                notifiedAt: null,
              },
            }),
          ]
        : []),
    ]);
    return this.findMaterial(materialId, courseId);
  }

  async setMaterialRelease(
    courseId: number,
    materialId: number,
    courseGroupId: number,
    user: JwtPayload,
    dto: SetMaterialReleaseDto,
  ) {
    await this.ensureMutableCourse(courseId, user);
    const material = await this.findMaterial(materialId, courseId);
    const release = material.releases.find(
      (item) => item.courseGroupId === courseGroupId,
    );
    if (!release) {
      throw new NotFoundException('Material release for this group not found');
    }

    const shouldNotify =
      dto.action === 'publish_now' &&
      release.status !== MaterialReleaseStatus.published;
    const data: Prisma.MaterialReleaseUpdateInput =
      dto.action === 'publish_now'
        ? {
            status: MaterialReleaseStatus.published,
            publishedAt: new Date(),
            scheduledAt: null,
            notifiedAt: shouldNotify ? null : release.notifiedAt,
            isOverridden: true,
          }
        : dto.action === 'withhold'
          ? {
              status: MaterialReleaseStatus.withheld,
              scheduledAt: null,
              publishedAt: null,
              notifiedAt: null,
              isOverridden: true,
            }
          : dto.action === 'schedule'
            ? this.scheduledReleaseData(dto.scheduledAt)
            : {
                status: material.defaultAvailableAt
                  ? MaterialReleaseStatus.scheduled
                  : MaterialReleaseStatus.draft,
                scheduledAt: material.defaultAvailableAt,
                publishedAt: null,
                notifiedAt: null,
                isOverridden: false,
              };

    const updated = await this.prisma.materialRelease.update({
      where: { id: release.id },
      data,
      include: {
        courseGroup: {
          include: { teachingAssignment: { include: { group: true } } },
        },
      },
    });
    if (shouldNotify) {
      await this.notifications.notifyMaterialPublished(updated.id);
    }
    return updated;
  }

  async getGroupProgress(
    courseId: number,
    courseGroupId: number,
    user: JwtPayload,
  ) {
    await this.ensureManageableCourse(courseId, user);
    const courseGroup = await this.prisma.courseGroup.findFirst({
      where: { id: courseGroupId, courseId },
      include: { teachingAssignment: { include: { group: true } } },
    });
    if (!courseGroup) {
      throw new NotFoundException('Course group not found');
    }
    const groupId = courseGroup.teachingAssignment.groupId;
    const [students, assignments] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: UserRole.student,
          isActive: true,
          userGroups: { some: { groupId } },
        },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.assignment.findMany({
        where: {
          courseId,
          status: { in: [AssignmentStatus.published, AssignmentStatus.closed] },
        },
        select: {
          id: true,
          title: true,
          gradingType: true,
          submissions: {
            include: { grade: true },
            orderBy: { attemptNumber: 'desc' },
          },
        },
      }),
    ]);

    return {
      courseGroupId,
      group: courseGroup.teachingAssignment.group,
      totalAssignments: assignments.length,
      students: students.map((student) => {
        let submittedAssignments = 0;
        let gradedAssignments = 0;
        let passedAssignments = 0;
        for (const assignment of assignments) {
          const submission = assignment.submissions.find(
            ({ studentId }) => studentId === student.id,
          );
          if (!submission) continue;
          submittedAssignments += 1;
          if (!submission.grade) continue;
          gradedAssignments += 1;
          if (
            assignment.gradingType === GradingType.scored ||
            submission.grade.result === GradeResult.passed
          ) {
            passedAssignments += 1;
          }
        }
        return {
          ...student,
          submittedAssignments,
          gradedAssignments,
          passedAssignments,
          pendingReview: submittedAssignments - gradedAssignments,
          progressPercent:
            assignments.length === 0
              ? 0
              : Math.round((gradedAssignments / assignments.length) * 100),
        };
      }),
    };
  }

  async archive(courseId: number, user: JwtPayload) {
    await this.ensureManageableCourse(courseId, user);
    await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.archived, archivedAt: new Date() },
    });
    return this.findOne(courseId, user);
  }

  async listBlocks(courseId: number, user: JwtPayload) {
    const course = await this.findOne(courseId, user);
    return course.blocks;
  }

  async createBlock(
    courseId: number,
    user: JwtPayload,
    dto: CreateCourseBlockDto,
  ) {
    await this.ensureMutableCourse(courseId, user);
    return this.prisma.courseBlock.create({
      data: {
        courseId,
        title: dto.title,
        orderIndex: dto.orderIndex,
        content: (dto.content ?? {}) as Prisma.InputJsonObject,
      },
    });
  }

  async updateBlock(
    courseId: number,
    blockId: number,
    user: JwtPayload,
    dto: UpdateCourseBlockDto,
  ) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('No block changes provided');
    }
    await this.ensureMutableCourse(courseId, user);
    await this.ensureCourseBlock(blockId, courseId);
    return this.prisma.courseBlock.update({
      where: { id: blockId },
      data: {
        title: dto.title,
        orderIndex: dto.orderIndex,
        ...(dto.content !== undefined
          ? { content: dto.content as Prisma.InputJsonObject }
          : {}),
      },
    });
  }

  async removeBlock(courseId: number, blockId: number, user: JwtPayload) {
    await this.ensureMutableCourse(courseId, user);
    await this.ensureCourseBlock(blockId, courseId);
    return this.prisma.courseBlock.delete({ where: { id: blockId } });
  }

  private scheduledReleaseData(scheduledAt?: string) {
    if (!scheduledAt) {
      throw new BadRequestException(
        'scheduledAt is required for the schedule action',
      );
    }
    return {
      status: MaterialReleaseStatus.scheduled,
      scheduledAt: new Date(scheduledAt),
      publishedAt: null,
      notifiedAt: null,
      isOverridden: true,
    } satisfies Prisma.MaterialReleaseUpdateInput;
  }

  private validateMaterialLocation(
    type: MaterialType,
    url?: string | null,
    filePath?: string | null,
  ) {
    if (type === MaterialType.link && (!url || filePath)) {
      throw new BadRequestException(
        'A link material requires url and must not contain filePath',
      );
    }
    if (type === MaterialType.file && (!filePath || url)) {
      throw new BadRequestException(
        'A file material requires filePath and must not contain url',
      );
    }
  }

  private async ensureCourseBlock(blockId: number, courseId: number) {
    const block = await this.prisma.courseBlock.findFirst({
      where: { id: blockId, courseId },
    });
    if (!block) {
      throw new NotFoundException('Course block not found');
    }
  }

  private async findMaterial(materialId: number, courseId: number) {
    const material = await this.prisma.material.findFirst({
      where: { id: materialId, courseId },
      include: {
        releases: {
          include: {
            courseGroup: {
              include: { teachingAssignment: { include: { group: true } } },
            },
          },
          orderBy: { courseGroupId: 'asc' },
        },
      },
    });
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    return material;
  }

  private async ensureManageableCourse(courseId: number, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { discipline: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    const allowed =
      user.role === UserRole.superadmin ||
      (user.role === UserRole.admin &&
        course.discipline.tenantId === user.tenantId) ||
      (user.role === UserRole.teacher && course.teacherId === user.id);
    if (!allowed) {
      throw new ForbiddenException('You cannot manage this course');
    }
    return course;
  }

  private async ensureMutableCourse(courseId: number, user: JwtPayload) {
    const course = await this.ensureManageableCourse(courseId, user);
    if (course.status === CourseStatus.archived) {
      throw new ConflictException('Archived course runs are read-only');
    }
    return course;
  }

  private async findAccessibleCourse(courseId: number, user: JwtPayload) {
    const where: Prisma.CourseWhereInput = {
      id: courseId,
      ...(user.role === UserRole.superadmin
        ? {}
        : user.role === UserRole.admin
          ? { discipline: { tenantId: user.tenantId } }
          : user.role === UserRole.teacher
            ? { teacherId: user.id }
            : {
                status: CourseStatus.published,
                courseGroups: {
                  some: {
                    teachingAssignment: {
                      group: { userGroups: { some: { userId: user.id } } },
                    },
                  },
                },
              }),
    };
    const course = await this.prisma.course.findFirst({
      where,
      include: {
        template: { select: { id: true, title: true, version: true } },
        discipline: true,
        teacher: { select: { id: true, fullName: true, email: true } },
        courseGroups: {
          include: {
            teachingAssignment: {
              include: {
                group: {
                  include: {
                    userGroups: { select: { userId: true } },
                  },
                },
              },
            },
          },
          orderBy: { id: 'asc' },
        },
        blocks: { orderBy: { orderIndex: 'asc' } },
        materials: {
          include: { releases: true },
          orderBy: { createdAt: 'asc' },
        },
        assignments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }
}
