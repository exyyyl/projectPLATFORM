import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BufferedUpload, FilesService } from './files.service';

describe('FilesService upload validation', () => {
  const context = {
    tenantId: 1,
    courseId: 2,
    assignmentId: 3,
    studentId: 4,
    allowedExtensions: ['pdf'],
    maxFileSizeBytes: 5 * 1024 * 1024,
  };

  function createService() {
    const service = new FilesService({} as PrismaService);
    const storage = {
      putObject: jest.fn().mockResolvedValue({ etag: 'test', versionId: null }),
      removeObjects: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(service as unknown as Record<string, unknown>, {
      client: storage,
      publicClient: storage,
      bucketReady: Promise.resolve(),
    });
    return { service, storage };
  }

  function upload(overrides: Partial<BufferedUpload> = {}): BufferedUpload {
    const buffer = Buffer.from('%PDF-1.7\n%%EOF');
    return {
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
      size: buffer.length,
      buffer,
      ...overrides,
    };
  }

  it('uploads a PDF under a generated private object key', async () => {
    const { service, storage } = createService();
    const result = await service.uploadSubmissionFile(upload(), context);

    expect(result.filePath).toMatch(
      /^tenants\/1\/courses\/2\/assignments\/3\/students\/4\/[\w-]+\.pdf$/,
    );
    expect(result.mimeType).toBe('application/pdf');
    expect(storage.putObject).toHaveBeenCalledTimes(1);
  });

  it('rejects executable extensions even when a client claims PDF MIME', async () => {
    const { service } = createService();
    await expect(
      service.uploadSubmissionFile(upload({ originalname: 'malware.exe' }), {
        ...context,
        allowedExtensions: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a fake PDF whose content has no PDF signature', async () => {
    const { service } = createService();
    const buffer = Buffer.from('plain text');
    await expect(
      service.uploadSubmissionFile(
        upload({ buffer, size: buffer.length }),
        context,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces the assignment file-size limit', async () => {
    const { service } = createService();
    const buffer = Buffer.from('%PDF-1.7\n%%EOF');
    await expect(
      service.uploadSubmissionFile(upload({ buffer, size: buffer.length }), {
        ...context,
        maxFileSizeBytes: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
