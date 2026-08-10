import { resolveCorsOrigins } from './cors.config';

describe('resolveCorsOrigins', () => {
  it('uses an explicit local allowlist in development', () => {
    expect(resolveCorsOrigins({ NODE_ENV: 'development' })).toContain(
      'http://localhost:5173',
    );
  });

  it('fails closed when production allowlist is missing', () => {
    expect(() => resolveCorsOrigins({ NODE_ENV: 'production' })).toThrow(
      'CORS_ORIGIN',
    );
  });

  it('normalizes and deduplicates configured origins', () => {
    expect(
      resolveCorsOrigins({
        NODE_ENV: 'production',
        CORS_ORIGIN:
          'https://platform.example, https://dashboard.example,https://platform.example',
      }),
    ).toEqual(['https://platform.example', 'https://dashboard.example']);
  });

  it('rejects origins with paths', () => {
    expect(() =>
      resolveCorsOrigins({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://platform.example/api',
      }),
    ).toThrow('plain HTTP(S) origin');
  });
});
