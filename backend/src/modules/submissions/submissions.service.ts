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
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BufferedUpload,
  FilesService,
  StoredUpload,
} from '../files/files.service';
import { CreateSubmissionDto } from './dto';

const submissionInclude = {
  student: { select: { id: true, fullName: true, email: true } },
  files: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
    },
  },
  grade: true,
} as const;

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async submit(
    assignmentId: number,
    user: JwtPayload,
    dto: CreateSubmissionDto,
    files: BufferedUpload[],
  ) {
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        status: AssignmentStatus.published,
        course: {
          status: CourseStatus.published,
          courseGroups: {
            some: {
              teachingAssignment: {
                group: { userGroups: { some: { userId: user.id } } },
              },
            },
          },
        },
      },
      include: { course: { include: { discipline: true } } },
    });
    if (!assignment) {
      throw new NotFoundException('Published assignment not found');
    }
    if (
      assignment.deadline &&
      assignment.deadline < new Date() &&
      !assignment.allowLateSubmissions
    ) {
      throw new ConflictException('The submission deadline has passed');
    }
    if (!files.length) {
      throw new BadRequestException('At least one file is required');
    }
    const effectiveMaxFiles = Math.min(
      assignment.maxFiles,
      this.readPositiveInt(process.env.UPLOAD_HARD_MAX_FILES, 10),
    );
    if (files.length > effectiveMaxFiles) {
      throw new BadRequestException(
        `This assignment allows at most ${effectiveMaxFiles} file(s)`,
      );
    }
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    const effectiveTotalLimit = Math.min(
      assignment.maxTotalSizeBytes,
      this.readPositiveInt(
        process.env.UPLOAD_HARD_MAX_TOTAL_SIZE_BYTES,
        262_144_000,
      ),
    );
    if (totalBytes > effectiveTotalLimit) {
      throw new BadRequestException(
        `Files exceed the total limit of ${effectiveTotalLimit} bytes`,
      );
    }

    const attempts = await this.prisma.submission.count({
      where: { assignmentId, studentId: user.id },
    });
    if (attempts >= assignment.maxAttempts) {
      throw new ConflictException(
        `The maximum of ${assignment.maxAttempts} attempt(s) has been reached`,
      );
    }

    const uploaded: StoredUpload[] = [];
    try {
      for (const file of files) {
        uploaded.push(
          await this.filesService.uploadSubmissionFile(file, {
            tenantId: assignment.course.discipline.tenantId,
            courseId: assignment.courseId,
            assignmentId,
            studentId: user.id,
            allowedExtensions: assignment.allowedExtensions,
            maxFileSizeBytes: assignment.maxFileSizeBytes,
          }),
        );
      }

      return await this.prisma.$transaction(async (tx) => {
        const submission = await tx.submission.create({
          data: {
            assignmentId,
            studentId: user.id,
            attemptNumber: attempts + 1,
            studentComment: dto.studentComment || null,
            files: {
              create: uploaded.map((file) => ({
                filePath: file.filePath,
                originalName: file.originalName,
                mimeType: file.mimeType,
                sizeBytes: file.sizeBytes,
              })),
            },
          },
          include: submissionInclude,
        });
        await tx.notification.create({
          data: {
            userId: assignment.course.teacherId,
            type: NotificationType.submission_received,
            referenceId: submission.id,
            referenceType: 'Submission',
            title: `Новая сдача: ${assignment.title}`,
            body: `${submission.student.fullName}, попытка ${submission.attemptNumber}`,
            data: {
              submissionId: submission.id,
              assignmentId,
              courseId: assignment.courseId,
              studentId: user.id,
            },
          },
        });
        return submission;
      });
    } catch (error) {
      await this.filesService.removeObjects(
        uploaded.map(({ filePath }) => filePath),
      );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('This attempt already exists');
      }
      throw error;
    }
  }

  async listByAssignment(assignmentId: number, user: JwtPayload) {
    const assignment = await this.ensureManageableAssignment(
      assignmentId,
      user,
    );
    return this.prisma.submission.findMany({
      where: { assignmentId: assignment.id },
      include: submissionInclude,
      orderBy: [{ studentId: 'asc' }, { attemptNumber: 'desc' }],
    });
  }

  private async ensureManageableAssignment(
    assignmentId: number,
    user: JwtPayload,
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: { include: { discipline: true } } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    const allowed =
      user.role === UserRole.superadmin ||
      (user.role === UserRole.admin &&
        assignment.course.discipline.tenantId === user.tenantId) ||
      (user.role === UserRole.teacher &&
        assignment.course.teacherId === user.id);
    if (!allowed) {
      throw new ForbiddenException('You cannot view these submissions');
    }
    return assignment;
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
