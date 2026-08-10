import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Client } from 'minio';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { EXECUTABLE_EXTENSIONS, SAFE_UPLOAD_EXTENSIONS } from './file-policy';

export interface BufferedUpload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface StoredUpload {
  filePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
}

interface UploadContext {
  tenantId: number;
  courseId: number;
  assignmentId: number;
  studentId: number;
  allowedExtensions: string[];
  maxFileSizeBytes: number;
}

@Injectable()
export class FilesService {
  private readonly client: Client;
  private readonly publicClient: Client;
  private readonly bucket: string;
  private readonly presignedTtlSeconds: number;
  private readonly hardMaxFileSizeBytes: number;
  private bucketReady?: Promise<void>;

  constructor(private readonly prisma: PrismaService) {
    this.bucket = process.env.MINIO_BUCKET || 'uploads';
    this.presignedTtlSeconds = this.readPositiveInt(
      process.env.MINIO_PRESIGNED_TTL_SEC,
      300,
    );
    this.hardMaxFileSizeBytes = this.readPositiveInt(
      process.env.UPLOAD_HARD_MAX_FILE_SIZE_BYTES,
      26_214_400,
    );
    const credentials = {
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    };
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: this.readPositiveInt(process.env.MINIO_PORT, 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      ...credentials,
    });
    this.publicClient = new Client({
      endPoint:
        process.env.MINIO_PUBLIC_ENDPOINT ||
        process.env.MINIO_ENDPOINT ||
        'localhost',
      port: this.readPositiveInt(
        process.env.MINIO_PUBLIC_PORT,
        this.readPositiveInt(process.env.MINIO_PORT, 9000),
      ),
      useSSL:
        (process.env.MINIO_PUBLIC_USE_SSL ?? process.env.MINIO_USE_SSL) ===
        'true',
      ...credentials,
    });
  }

  async uploadSubmissionFile(
    file: BufferedUpload,
    context: UploadContext,
  ): Promise<StoredUpload> {
    const extension = this.validateFile(file, context);
    await this.ensureBucket();
    const filePath = [
      'tenants',
      context.tenantId,
      'courses',
      context.courseId,
      'assignments',
      context.assignmentId,
      'students',
      context.studentId,
      `${randomUUID()}.${extension}`,
    ].join('/');
    const originalName = this.safeOriginalName(file.originalname);
    const mimeType = this.canonicalMime(extension);
    const checksumSha256 = createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    try {
      await this.client.putObject(
        this.bucket,
        filePath,
        file.buffer,
        file.size,
        {
          'Content-Type': mimeType,
          'X-Amz-Meta-Original-Name': encodeURIComponent(originalName),
          'X-Amz-Meta-Sha256': checksumSha256,
        },
      );
    } catch {
      throw new ServiceUnavailableException('File storage is unavailable');
    }

    return {
      filePath,
      originalName,
      mimeType,
      sizeBytes: file.size,
      checksumSha256,
    };
  }

  async removeObjects(filePaths: string[]): Promise<void> {
    if (!filePaths.length) return;
    try {
      await this.client.removeObjects(this.bucket, filePaths);
    } catch {
      // Database consistency has priority. Orphan cleanup can be retried by a job.
    }
  }

  async getSubmissionDownload(fileId: number, user: JwtPayload) {
    const file = await this.prisma.submissionFile.findUnique({
      where: { id: fileId },
      include: {
        submission: {
          include: {
            assignment: {
              include: {
                course: { include: { discipline: true } },
              },
            },
          },
        },
      },
    });
    if (!file) throw new NotFoundException('File not found');

    const course = file.submission.assignment.course;
    const allowed =
      user.role === UserRole.superadmin ||
      (user.role === UserRole.admin &&
        course.discipline.tenantId === user.tenantId) ||
      (user.role === UserRole.teacher && course.teacherId === user.id) ||
      (user.role === UserRole.student && file.submission.studentId === user.id);
    if (!allowed) throw new ForbiddenException('You cannot download this file');

    await this.ensureBucket();
    try {
      const url = await this.publicClient.presignedGetObject(
        this.bucket,
        file.filePath,
        this.presignedTtlSeconds,
        {
          'response-content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
        },
      );
      return {
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        url,
        expiresInSeconds: this.presignedTtlSeconds,
      };
    } catch {
      throw new ServiceUnavailableException('File storage is unavailable');
    }
  }

  private validateFile(file: BufferedUpload, context: UploadContext): string {
    if (!file.buffer?.length || file.size <= 0) {
      throw new BadRequestException('Empty files are not allowed');
    }
    if (file.size !== file.buffer.length) {
      throw new BadRequestException('Uploaded file size is inconsistent');
    }
    const effectiveLimit = Math.min(
      context.maxFileSizeBytes,
      this.hardMaxFileSizeBytes,
    );
    if (file.size > effectiveLimit) {
      throw new BadRequestException(
        `File exceeds the effective limit of ${effectiveLimit} bytes`,
      );
    }

    const extension = extname(file.originalname).slice(1).toLowerCase();
    if (!extension) throw new BadRequestException('File extension is required');
    if (EXECUTABLE_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Executable files are forbidden');
    }
    if (!SAFE_UPLOAD_EXTENSIONS.has(extension)) {
      throw new BadRequestException(`Unsupported file extension: ${extension}`);
    }
    const allowed = context.allowedExtensions.map((item) => item.toLowerCase());
    if (allowed.length && !allowed.includes(extension)) {
      throw new BadRequestException(
        `Extension .${extension} is not allowed for this assignment`,
      );
    }

    this.validateMagicBytes(extension, file.buffer);
    this.validateClaimedMime(extension, file.mimetype);
    return extension;
  }

  private validateMagicBytes(extension: string, buffer: Buffer): void {
    const starts = (...bytes: number[]) =>
      bytes.every((byte, index) => buffer[index] === byte);
    const zip =
      starts(0x50, 0x4b, 0x03, 0x04) ||
      starts(0x50, 0x4b, 0x05, 0x06) ||
      starts(0x50, 0x4b, 0x07, 0x08);
    const valid =
      extension === 'pdf'
        ? buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))
        : ['zip', 'docx', 'xlsx', 'pptx', 'odt', 'ods'].includes(extension)
          ? zip
          : extension === 'png'
            ? starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
            : ['jpg', 'jpeg'].includes(extension)
              ? starts(0xff, 0xd8, 0xff)
              : extension === 'gif'
                ? buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
                  buffer.subarray(0, 6).toString('ascii') === 'GIF89a'
                : extension === 'webp'
                  ? buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
                    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
                  : this.isSafeText(buffer, extension === 'json');
    if (!valid) {
      throw new BadRequestException(
        `File content does not match the .${extension} extension`,
      );
    }
  }

  private isSafeText(buffer: Buffer, mustBeJson: boolean): boolean {
    if (buffer.includes(0)) return false;
    try {
      const value = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      if (mustBeJson) JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  private validateClaimedMime(extension: string, claimedMime: string): void {
    const claimed = claimedMime.toLowerCase();
    if (!claimed || claimed === 'application/octet-stream') return;
    const accepted: Record<string, string[]> = {
      pdf: ['application/pdf', 'application/x-pdf'],
      zip: ['application/zip', 'application/x-zip-compressed'],
      docx: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip',
      ],
      xlsx: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
      ],
      pptx: [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip',
      ],
      odt: ['application/vnd.oasis.opendocument.text', 'application/zip'],
      ods: [
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/zip',
      ],
      png: ['image/png'],
      jpg: ['image/jpeg'],
      jpeg: ['image/jpeg'],
      gif: ['image/gif'],
      webp: ['image/webp'],
      json: ['application/json', 'text/json'],
      txt: ['text/plain'],
      md: ['text/plain', 'text/markdown'],
      csv: ['text/plain', 'text/csv', 'application/csv'],
      sql: ['text/plain', 'application/sql', 'text/x-sql'],
      js: ['text/plain', 'text/javascript', 'application/javascript'],
      jsx: ['text/plain', 'text/javascript', 'application/javascript'],
      ts: ['text/plain', 'text/typescript', 'application/typescript'],
      tsx: ['text/plain', 'text/typescript', 'application/typescript'],
      py: ['text/plain', 'text/x-python', 'application/x-python-code'],
      html: ['text/plain', 'text/html'],
      css: ['text/plain', 'text/css'],
      xml: ['text/plain', 'text/xml', 'application/xml'],
      yaml: ['text/plain', 'application/yaml', 'text/yaml'],
      yml: ['text/plain', 'application/yaml', 'text/yaml'],
    };
    const expected = accepted[extension] ?? ['text/plain'];
    if (!expected.includes(claimed)) {
      throw new BadRequestException(
        `Declared MIME type ${claimedMime} does not match .${extension}`,
      );
    }
  }

  private canonicalMime(extension: string): string {
    const values: Record<string, string> = {
      pdf: 'application/pdf',
      zip: 'application/zip',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      odt: 'application/vnd.oasis.opendocument.text',
      ods: 'application/vnd.oasis.opendocument.spreadsheet',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      json: 'application/json',
      csv: 'text/csv',
      sql: 'application/sql',
    };
    return values[extension] ?? 'text/plain';
  }

  private safeOriginalName(value: string): string {
    const normalized = value.replace(/\\/g, '/').split('/').pop() || 'file';
    return [...normalized]
      .filter((character) => {
        const code = character.charCodeAt(0);
        return code > 31 && code !== 127;
      })
      .join('')
      .slice(0, 255);
  }

  private ensureBucket(): Promise<void> {
    this.bucketReady ??= (async () => {
      try {
        if (!(await this.client.bucketExists(this.bucket))) {
          await this.client.makeBucket(this.bucket);
        }
      } catch {
        this.bucketReady = undefined;
        throw new ServiceUnavailableException('File storage is unavailable');
      }
    })();
    return this.bucketReady;
  }

  private readPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
