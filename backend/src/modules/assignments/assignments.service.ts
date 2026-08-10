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
  GradingType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { assertSafeAllowedExtensions } from '../files/file-policy';
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto';

const assignmentInclude = {
  block: { select: { id: true, title: true, orderIndex: true } },
  course: {
    select: {
      id: true,
      title: true,
      status: true,
      academicYear: true,
      semester: true,
      discipline: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true, email: true } },
    },
  },
  _count: { select: { submissions: true } },
} as const;

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(courseId: number, user: JwtPayload) {
    await this.ensureAccessibleCourse(courseId, user);
    return this.prisma.assignment.findMany({
      where: {
        courseId,
        ...(user.role === UserRole.student
          ? {
              status: {
                in: [AssignmentStatus.published, AssignmentStatus.closed],
              },
            }
          : {}),
      },
      include: assignmentInclude,
      orderBy: [{ deadline: 'asc' }, { id: 'asc' }],
    });
  }

  async findOne(assignmentId: number, user: JwtPayload) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: assignmentInclude,
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.ensureAccessibleCourse(assignment.courseId, user);
    if (
      user.role === UserRole.student &&
      assignment.status === AssignmentStatus.draft
    ) {
      throw new NotFoundException('Assignment not found');
    }
    return assignment;
  }

  async create(courseId: number, user: JwtPayload, dto: CreateAssignmentDto) {
    await this.ensureMutableCourse(courseId, user);
    if (dto.blockId) await this.ensureRunBlock(courseId, dto.blockId);
    this.validateGrading(dto.gradingType, dto.maxScore);
    assertSafeAllowedExtensions(dto.allowedExtensions ?? []);
    this.validateSubmissionPolicy(
      dto.maxFiles ?? 5,
      dto.maxFileSizeBytes ?? 26_214_400,
      dto.maxTotalSizeBytes ?? 52_428_800,
    );
    return this.prisma.assignment.create({
      data: {
        courseId,
        blockId: dto.blockId,
        title: dto.title,
        description: dto.description ?? '',
        gradingType: dto.gradingType,
        maxScore: dto.maxScore,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        allowedExtensions: this.unique(dto.allowedExtensions ?? []),
        maxAttempts: dto.maxAttempts,
        maxFiles: dto.maxFiles,
        maxFileSizeBytes: dto.maxFileSizeBytes,
        maxTotalSizeBytes: dto.maxTotalSizeBytes,
        allowLateSubmissions: dto.allowLateSubmissions,
        createdBy: user.id,
      },
      include: assignmentInclude,
    });
  }

  async update(
    assignmentId: number,
    user: JwtPayload,
    dto: UpdateAssignmentDto,
  ) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('No assignment changes provided');
    }
    const existing = await this.ensureManageableAssignment(assignmentId, user);
    await this.ensureMutableCourse(existing.courseId, user);
    if (existing.status === AssignmentStatus.closed) {
      throw new ConflictException('Closed assignments are read-only');
    }
    if (dto.blockId) await this.ensureRunBlock(existing.courseId, dto.blockId);

    const gradingType = dto.gradingType ?? existing.gradingType;
    const maxScore =
      dto.maxScore === undefined ? existing.maxScore : dto.maxScore;
    this.validateGrading(gradingType, maxScore);
    assertSafeAllowedExtensions(
      dto.allowedExtensions ?? existing.allowedExtensions,
    );
    this.validateSubmissionPolicy(
      dto.maxFiles ?? existing.maxFiles,
      dto.maxFileSizeBytes ?? existing.maxFileSizeBytes,
      dto.maxTotalSizeBytes ?? existing.maxTotalSizeBytes,
    );
    if (
      existing._count.submissions > 0 &&
      (dto.gradingType !== undefined || dto.maxScore !== undefined)
    ) {
      throw new ConflictException(
        'Grading settings cannot change after the first submission',
      );
    }
    if (dto.maxAttempts !== undefined && existing._count.submissions > 0) {
      const attempts = await this.prisma.submission.aggregate({
        where: { assignmentId },
        _max: { attemptNumber: true },
      });
      if (dto.maxAttempts < (attempts._max.attemptNumber ?? 0)) {
        throw new ConflictException(
          'maxAttempts cannot be lower than an existing attempt number',
        );
      }
    }

    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        blockId: dto.blockId,
        title: dto.title,
        description: dto.description,
        gradingType: dto.gradingType,
        maxScore: dto.maxScore,
        ...(dto.deadline !== undefined
          ? { deadline: dto.deadline ? new Date(dto.deadline) : null }
          : {}),
        ...(dto.allowedExtensions !== undefined
          ? { allowedExtensions: this.unique(dto.allowedExtensions) }
          : {}),
        maxAttempts: dto.maxAttempts,
        maxFiles: dto.maxFiles,
        maxFileSizeBytes: dto.maxFileSizeBytes,
        maxTotalSizeBytes: dto.maxTotalSizeBytes,
        allowLateSubmissions: dto.allowLateSubmissions,
      },
      include: assignmentInclude,
    });
  }

  async publish(assignmentId: number, user: JwtPayload) {
    const assignment = await this.ensureManageableAssignment(
      assignmentId,
      user,
    );
    await this.ensureMutableCourse(assignment.courseId, user);
    if (assignment.status === AssignmentStatus.closed) {
      throw new ConflictException('A closed assignment cannot be republished');
    }
    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: AssignmentStatus.published },
      include: assignmentInclude,
    });
  }

  async close(assignmentId: number, user: JwtPayload) {
    const assignment = await this.ensureManageableAssignment(
      assignmentId,
      user,
    );
    await this.ensureMutableCourse(assignment.courseId, user);
    if (assignment.status === AssignmentStatus.draft) {
      throw new ConflictException('Publish the assignment before closing it');
    }
    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: AssignmentStatus.closed },
      include: assignmentInclude,
    });
  }

  async remove(assignmentId: number, user: JwtPayload) {
    const assignment = await this.ensureManageableAssignment(
      assignmentId,
      user,
    );
    await this.ensureMutableCourse(assignment.courseId, user);
    if (assignment.status !== AssignmentStatus.draft) {
      throw new ConflictException('Only a draft assignment can be deleted');
    }
    if (assignment._count.submissions > 0) {
      throw new ConflictException(
        'Assignment with submissions cannot be deleted',
      );
    }
    return this.prisma.assignment.delete({ where: { id: assignmentId } });
  }

  private unique(values: string[]) {
    return [...new Set(values)];
  }

  private validateGrading(gradingType: GradingType, maxScore?: number | null) {
    if (gradingType === GradingType.scored && !maxScore) {
      throw new BadRequestException('maxScore is required for scored grading');
    }
    if (gradingType === GradingType.pass_fail && maxScore != null) {
      throw new BadRequestException(
        'maxScore must be empty for pass/fail grading',
      );
    }
  }

  private validateSubmissionPolicy(
    maxFiles: number,
    maxFileSizeBytes: number,
    maxTotalSizeBytes: number,
  ) {
    if (maxTotalSizeBytes < maxFileSizeBytes) {
      throw new BadRequestException(
        'maxTotalSizeBytes must be greater than or equal to maxFileSizeBytes',
      );
    }
    this.ensureWithinServerLimit(
      maxFiles,
      'maxFiles',
      'UPLOAD_HARD_MAX_FILES',
      5,
    );
    this.ensureWithinServerLimit(
      maxFileSizeBytes,
      'maxFileSizeBytes',
      'UPLOAD_HARD_MAX_FILE_SIZE_BYTES',
      26_214_400,
    );
    this.ensureWithinServerLimit(
      maxTotalSizeBytes,
      'maxTotalSizeBytes',
      'UPLOAD_HARD_MAX_TOTAL_SIZE_BYTES',
      104_857_600,
    );
  }

  private ensureWithinServerLimit(
    value: number,
    field: string,
    environmentName: string,
    fallback: number,
  ) {
    const configured = Number(process.env[environmentName]);
    const limit =
      Number.isInteger(configured) && configured > 0 ? configured : fallback;
    if (value > limit) {
      throw new BadRequestException(`${field} exceeds server limit ${limit}`);
    }
  }

  private async ensureRunBlock(courseId: number, blockId: number) {
    const block = await this.prisma.courseBlock.findFirst({
      where: { id: blockId, courseId },
    });
    if (!block) throw new NotFoundException('Course block not found');
  }

  private async ensureManageableAssignment(
    assignmentId: number,
    user: JwtPayload,
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { _count: { select: { submissions: true } } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.ensureManageableCourse(assignment.courseId, user);
    return assignment;
  }

  private async ensureAccessibleCourse(courseId: number, user: JwtPayload) {
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
    const course = await this.prisma.course.findFirst({ where });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  private async ensureManageableCourse(courseId: number, user: JwtPayload) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { discipline: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    const allowed =
      user.role === UserRole.superadmin ||
      (user.role === UserRole.admin &&
        course.discipline.tenantId === user.tenantId) ||
      (user.role === UserRole.teacher && course.teacherId === user.id);
    if (!allowed) throw new ForbiddenException('You cannot manage this course');
    return course;
  }

  private async ensureMutableCourse(courseId: number, user: JwtPayload) {
    const course = await this.ensureManageableCourse(courseId, user);
    if (course.status === CourseStatus.archived) {
      throw new ConflictException('Archived course runs are read-only');
    }
    return course;
  }
}
