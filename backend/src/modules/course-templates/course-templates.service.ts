import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GradingType, Prisma, UserRole } from '@prisma/client';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { assertSafeAllowedExtensions } from '../files/file-policy';
import {
  CreateCourseRunDto,
  CreateCourseTemplateDto,
  CreateTemplateAssignmentDto,
  CreateTemplateBlockDto,
  UpdateCourseTemplateDto,
  UpdateTemplateAssignmentDto,
  UpdateTemplateBlockDto,
} from './dto';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const templateInclude = {
  discipline: { select: { id: true, name: true } },
  owner: { select: { id: true, fullName: true, email: true } },
  blocks: { orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }] },
  assignments: {
    include: { block: { select: { id: true, title: true, orderIndex: true } } },
    orderBy: { id: 'asc' },
  },
  runs: {
    select: {
      id: true,
      title: true,
      academicYear: true,
      semester: true,
      status: true,
      startsAt: true,
      endsAt: true,
      archivedAt: true,
    },
    orderBy: { id: 'desc' },
  },
} satisfies Prisma.CourseTemplateInclude;

@Injectable()
export class CourseTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(user: JwtPayload) {
    const where: Prisma.CourseTemplateWhereInput =
      user.role === UserRole.superadmin
        ? {}
        : user.role === UserRole.admin
          ? { tenantId: user.tenantId }
          : { ownerId: user.id };
    return this.prisma.courseTemplate.findMany({
      where,
      include: {
        discipline: { select: { id: true, name: true } },
        owner: { select: { id: true, fullName: true, email: true } },
        _count: { select: { blocks: true, assignments: true, runs: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(templateId: number, user: JwtPayload) {
    await this.ensureManageableTemplate(templateId, user);
    return this.prisma.courseTemplate.findUniqueOrThrow({
      where: { id: templateId },
      include: templateInclude,
    });
  }

  async create(user: JwtPayload, dto: CreateCourseTemplateDto) {
    const discipline = await this.prisma.discipline.findUnique({
      where: { id: dto.disciplineId },
    });
    if (!discipline) throw new NotFoundException('Discipline not found');
    if (
      user.role !== UserRole.superadmin &&
      discipline.tenantId !== user.tenantId
    ) {
      throw new ForbiddenException('Discipline belongs to another tenant');
    }

    const ownerId =
      user.role === UserRole.teacher ? user.id : (dto.ownerId ?? 0);
    if (!ownerId) {
      throw new BadRequestException('ownerId is required for an admin');
    }
    if (
      user.role === UserRole.teacher &&
      dto.ownerId !== undefined &&
      dto.ownerId !== user.id
    ) {
      throw new ForbiddenException('A teacher can own only their template');
    }
    await this.ensureAssignedTeacher(
      discipline.id,
      discipline.tenantId,
      ownerId,
    );

    const created = await this.prisma.courseTemplate.create({
      data: {
        tenantId: discipline.tenantId,
        disciplineId: discipline.id,
        ownerId,
        title: dto.title,
        description: dto.description ?? '',
      },
    });
    return this.findOne(created.id, user);
  }

  async update(
    templateId: number,
    user: JwtPayload,
    dto: UpdateCourseTemplateDto,
  ) {
    this.ensureChanges(dto, 'No template changes provided');
    await this.ensureManageableTemplate(templateId, user);
    await this.prisma.courseTemplate.update({
      where: { id: templateId },
      data: { ...dto, version: { increment: 1 } },
    });
    return this.findOne(templateId, user);
  }

  async deactivate(templateId: number, user: JwtPayload) {
    await this.ensureManageableTemplate(templateId, user);
    await this.prisma.courseTemplate.update({
      where: { id: templateId },
      data: { isActive: false, version: { increment: 1 } },
    });
    return this.findOne(templateId, user);
  }

  async listBlocks(templateId: number, user: JwtPayload) {
    await this.ensureManageableTemplate(templateId, user);
    return this.prisma.courseTemplateBlock.findMany({
      where: { templateId },
      orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
    });
  }

  async createBlock(
    templateId: number,
    user: JwtPayload,
    dto: CreateTemplateBlockDto,
  ) {
    await this.ensureActiveTemplate(templateId, user);
    return this.prisma.$transaction(async (tx) => {
      const block = await tx.courseTemplateBlock.create({
        data: {
          templateId,
          title: dto.title,
          orderIndex: dto.orderIndex,
          content: (dto.content ?? {}) as Prisma.InputJsonObject,
        },
      });
      await tx.courseTemplate.update({
        where: { id: templateId },
        data: { version: { increment: 1 } },
      });
      return block;
    });
  }

  async updateBlock(
    templateId: number,
    blockId: number,
    user: JwtPayload,
    dto: UpdateTemplateBlockDto,
  ) {
    this.ensureChanges(dto, 'No block changes provided');
    await this.ensureActiveTemplate(templateId, user);
    await this.ensureTemplateBlock(templateId, blockId);
    return this.prisma.$transaction(async (tx) => {
      const block = await tx.courseTemplateBlock.update({
        where: { id: blockId },
        data: {
          title: dto.title,
          orderIndex: dto.orderIndex,
          ...(dto.content !== undefined
            ? { content: dto.content as Prisma.InputJsonObject }
            : {}),
        },
      });
      await tx.courseTemplate.update({
        where: { id: templateId },
        data: { version: { increment: 1 } },
      });
      return block;
    });
  }

  async removeBlock(templateId: number, blockId: number, user: JwtPayload) {
    await this.ensureActiveTemplate(templateId, user);
    await this.ensureTemplateBlock(templateId, blockId);
    return this.prisma.$transaction(async (tx) => {
      const block = await tx.courseTemplateBlock.delete({
        where: { id: blockId },
      });
      await tx.courseTemplate.update({
        where: { id: templateId },
        data: { version: { increment: 1 } },
      });
      return block;
    });
  }

  async listAssignments(templateId: number, user: JwtPayload) {
    await this.ensureManageableTemplate(templateId, user);
    return this.prisma.courseTemplateAssignment.findMany({
      where: { templateId },
      include: {
        block: { select: { id: true, title: true, orderIndex: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async createAssignment(
    templateId: number,
    user: JwtPayload,
    dto: CreateTemplateAssignmentDto,
  ) {
    await this.ensureActiveTemplate(templateId, user);
    if (dto.blockId) await this.ensureTemplateBlock(templateId, dto.blockId);
    this.validateGrading(dto.gradingType, dto.maxScore);
    assertSafeAllowedExtensions(dto.allowedExtensions ?? []);
    this.validateSubmissionPolicy(
      dto.maxFiles ?? 5,
      dto.maxFileSizeBytes ?? 26_214_400,
      dto.maxTotalSizeBytes ?? 52_428_800,
    );
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.courseTemplateAssignment.create({
        data: {
          templateId,
          blockId: dto.blockId,
          title: dto.title,
          description: dto.description ?? '',
          gradingType: dto.gradingType,
          maxScore: dto.maxScore,
          deadlineOffsetDays: dto.deadlineOffsetDays,
          allowedExtensions: this.unique(dto.allowedExtensions ?? []),
          maxAttempts: dto.maxAttempts,
          maxFiles: dto.maxFiles,
          maxFileSizeBytes: dto.maxFileSizeBytes,
          maxTotalSizeBytes: dto.maxTotalSizeBytes,
          allowLateSubmissions: dto.allowLateSubmissions,
          createdBy: user.id,
        },
      });
      await tx.courseTemplate.update({
        where: { id: templateId },
        data: { version: { increment: 1 } },
      });
      return assignment;
    });
  }

  async updateAssignment(
    templateId: number,
    assignmentId: number,
    user: JwtPayload,
    dto: UpdateTemplateAssignmentDto,
  ) {
    this.ensureChanges(dto, 'No assignment changes provided');
    await this.ensureActiveTemplate(templateId, user);
    const existing = await this.prisma.courseTemplateAssignment.findFirst({
      where: { id: assignmentId, templateId },
    });
    if (!existing) throw new NotFoundException('Template assignment not found');
    if (dto.blockId) await this.ensureTemplateBlock(templateId, dto.blockId);
    this.validateGrading(
      dto.gradingType ?? existing.gradingType,
      dto.maxScore === undefined ? existing.maxScore : dto.maxScore,
    );
    assertSafeAllowedExtensions(
      dto.allowedExtensions ?? existing.allowedExtensions,
    );
    this.validateSubmissionPolicy(
      dto.maxFiles ?? existing.maxFiles,
      dto.maxFileSizeBytes ?? existing.maxFileSizeBytes,
      dto.maxTotalSizeBytes ?? existing.maxTotalSizeBytes,
    );
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.courseTemplateAssignment.update({
        where: { id: assignmentId },
        data: {
          blockId: dto.blockId,
          title: dto.title,
          description: dto.description,
          gradingType: dto.gradingType,
          maxScore: dto.maxScore,
          deadlineOffsetDays: dto.deadlineOffsetDays,
          ...(dto.allowedExtensions !== undefined
            ? { allowedExtensions: this.unique(dto.allowedExtensions) }
            : {}),
          maxAttempts: dto.maxAttempts,
          maxFiles: dto.maxFiles,
          maxFileSizeBytes: dto.maxFileSizeBytes,
          maxTotalSizeBytes: dto.maxTotalSizeBytes,
          allowLateSubmissions: dto.allowLateSubmissions,
        },
      });
      await tx.courseTemplate.update({
        where: { id: templateId },
        data: { version: { increment: 1 } },
      });
      return assignment;
    });
  }

  async removeAssignment(
    templateId: number,
    assignmentId: number,
    user: JwtPayload,
  ) {
    await this.ensureActiveTemplate(templateId, user);
    const existing = await this.prisma.courseTemplateAssignment.findFirst({
      where: { id: assignmentId, templateId },
    });
    if (!existing) throw new NotFoundException('Template assignment not found');
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.courseTemplateAssignment.delete({
        where: { id: assignmentId },
      });
      await tx.courseTemplate.update({
        where: { id: templateId },
        data: { version: { increment: 1 } },
      });
      return assignment;
    });
  }

  async createRun(
    templateId: number,
    user: JwtPayload,
    dto: CreateCourseRunDto,
  ) {
    const template = await this.ensureActiveTemplate(templateId, user);
    this.validateAcademicYear(dto.academicYear);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be later than startsAt');
    }
    const teacherId =
      user.role === UserRole.teacher
        ? user.id
        : (dto.teacherId ?? template.ownerId);
    if (
      user.role === UserRole.teacher &&
      dto.teacherId !== undefined &&
      dto.teacherId !== user.id
    ) {
      throw new ForbiddenException('A teacher can create only their own run');
    }
    await this.ensureAssignedTeacher(
      template.disciplineId,
      template.tenantId,
      teacherId,
    );

    const existingRun = await this.prisma.course.findFirst({
      where: {
        templateId,
        academicYear: dto.academicYear,
        semester: dto.semester ?? null,
        teacherId,
      },
    });
    if (existingRun) {
      throw new ConflictException(
        'This template already has a run for the teacher, year and semester',
      );
    }

    const assignmentIds = [...new Set(dto.teachingAssignmentIds ?? [])];
    const [templateBlocks, templateAssignments, teachingAssignments] =
      await Promise.all([
        this.prisma.courseTemplateBlock.findMany({
          where: { templateId },
          orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }],
        }),
        this.prisma.courseTemplateAssignment.findMany({
          where: { templateId },
          orderBy: { id: 'asc' },
        }),
        assignmentIds.length
          ? this.prisma.teachingAssignment.findMany({
              where: {
                id: { in: assignmentIds },
                disciplineId: template.disciplineId,
                teacherId,
                group: { tenantId: template.tenantId },
              },
            })
          : Promise.resolve([]),
      ]);
    if (
      teachingAssignments.length !== assignmentIds.length ||
      teachingAssignments.some(
        (assignment) =>
          assignment.disciplineId !== template.disciplineId ||
          assignment.teacherId !== teacherId,
      )
    ) {
      throw new ConflictException(
        'Every group assignment must match the template discipline and run teacher',
      );
    }
    if (
      !startsAt &&
      templateAssignments.some(
        ({ deadlineOffsetDays }) => deadlineOffsetDays !== null,
      )
    ) {
      throw new BadRequestException(
        'startsAt is required when the template contains relative deadlines',
      );
    }

    const run = await this.prisma.$transaction(async (tx) => {
      const createdRun = await tx.course.create({
        data: {
          templateId,
          templateVersion: template.version,
          disciplineId: template.disciplineId,
          teacherId,
          title: dto.title ?? template.title,
          description: template.description,
          academicYear: dto.academicYear,
          semester: dto.semester,
          startsAt,
          endsAt,
        },
      });
      const blockMap = new Map<number, number>();
      for (const block of templateBlocks) {
        const createdBlock = await tx.courseBlock.create({
          data: {
            courseId: createdRun.id,
            title: block.title,
            orderIndex: block.orderIndex,
            content: block.content as Prisma.InputJsonValue,
          },
        });
        blockMap.set(block.id, createdBlock.id);
      }
      if (templateAssignments.length) {
        await tx.assignment.createMany({
          data: templateAssignments.map((assignment) => ({
            courseId: createdRun.id,
            blockId: assignment.blockId
              ? (blockMap.get(assignment.blockId) ?? null)
              : null,
            title: assignment.title,
            description: assignment.description,
            gradingType: assignment.gradingType,
            maxScore: assignment.maxScore,
            deadline:
              startsAt && assignment.deadlineOffsetDays !== null
                ? new Date(
                    startsAt.getTime() +
                      assignment.deadlineOffsetDays * DAY_IN_MS,
                  )
                : null,
            allowedExtensions: assignment.allowedExtensions,
            maxAttempts: assignment.maxAttempts,
            maxFiles: assignment.maxFiles,
            maxFileSizeBytes: assignment.maxFileSizeBytes,
            maxTotalSizeBytes: assignment.maxTotalSizeBytes,
            allowLateSubmissions: assignment.allowLateSubmissions,
            createdBy: user.id,
          })),
        });
      }
      if (assignmentIds.length) {
        await tx.courseGroup.createMany({
          data: assignmentIds.map((teachingAssignmentId) => ({
            courseId: createdRun.id,
            teachingAssignmentId,
          })),
        });
      }
      return createdRun;
    });

    return this.prisma.course.findUniqueOrThrow({
      where: { id: run.id },
      include: {
        template: { select: { id: true, title: true, version: true } },
        discipline: { select: { id: true, name: true } },
        teacher: { select: { id: true, fullName: true, email: true } },
        blocks: { orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }] },
        assignments: { orderBy: { id: 'asc' } },
        courseGroups: {
          include: {
            teachingAssignment: { include: { group: true } },
          },
        },
      },
    });
  }

  private ensureChanges(dto: object, message: string) {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException(message);
    }
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

  private validateAcademicYear(value: string) {
    const [start, end] = value.split('/').map(Number);
    if (end !== start + 1) {
      throw new BadRequestException(
        'academicYear must contain consecutive years, for example 2026/2027',
      );
    }
  }

  private async ensureAssignedTeacher(
    disciplineId: number,
    tenantId: number,
    teacherId: number,
  ) {
    const assignment = await this.prisma.disciplineTeacher.findFirst({
      where: {
        disciplineId,
        userId: teacherId,
        teacher: { tenantId, role: UserRole.teacher, isActive: true },
      },
    });
    if (!assignment) {
      throw new ConflictException(
        'Teacher must be active and assigned to the discipline first',
      );
    }
  }

  private async ensureTemplateBlock(templateId: number, blockId: number) {
    const block = await this.prisma.courseTemplateBlock.findFirst({
      where: { id: blockId, templateId },
    });
    if (!block) throw new NotFoundException('Template block not found');
    return block;
  }

  private async ensureActiveTemplate(templateId: number, user: JwtPayload) {
    const template = await this.ensureManageableTemplate(templateId, user);
    if (!template.isActive) {
      throw new ConflictException('Course template is inactive');
    }
    return template;
  }

  private async ensureManageableTemplate(templateId: number, user: JwtPayload) {
    const template = await this.prisma.courseTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Course template not found');
    const allowed =
      user.role === UserRole.superadmin ||
      (user.role === UserRole.admin && template.tenantId === user.tenantId) ||
      (user.role === UserRole.teacher && template.ownerId === user.id);
    if (!allowed) {
      throw new ForbiddenException('You cannot manage this course template');
    }
    return template;
  }
}
