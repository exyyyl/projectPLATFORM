import { Injectable } from '@nestjs/common';

/**
 * Потоковая загрузка, проверка MIME + magic bytes (file-type),
 * хранение в MinIO, presigned URL (TTL ~5 мин).
 */
@Injectable()
export class FilesService {}
