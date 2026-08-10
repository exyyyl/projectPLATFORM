import { BadRequestException } from '@nestjs/common';

export const SAFE_UPLOAD_EXTENSIONS = new Set([
  'pdf',
  'zip',
  'docx',
  'xlsx',
  'pptx',
  'odt',
  'ods',
  'txt',
  'md',
  'csv',
  'json',
  'sql',
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'java',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'go',
  'rs',
  'php',
  'html',
  'css',
  'xml',
  'yaml',
  'yml',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
]);

export const EXECUTABLE_EXTENSIONS = new Set([
  'exe',
  'msi',
  'dll',
  'com',
  'bat',
  'cmd',
  'ps1',
  'sh',
  'scr',
  'jar',
  'app',
  'deb',
  'rpm',
]);

export function assertSafeAllowedExtensions(extensions: string[]): void {
  const unsupported = extensions.find(
    (extension) =>
      EXECUTABLE_EXTENSIONS.has(extension) ||
      !SAFE_UPLOAD_EXTENSIONS.has(extension),
  );
  if (unsupported) {
    throw new BadRequestException(
      `Extension .${unsupported} is not supported for uploads`,
    );
  }
}
