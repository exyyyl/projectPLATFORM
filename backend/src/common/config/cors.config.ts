const LOCAL_ORIGINS = [
  'http://localhost:5173',
  'http://localhost',
  'http://app.localhost',
  'http://dashboard.localhost',
] as const;

interface Environment {
  NODE_ENV?: string;
  CORS_ORIGIN?: string;
}

export function resolveCorsOrigins(environment: Environment): string[] {
  const configuredOrigins = environment.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!configuredOrigins?.length) {
    if (environment.NODE_ENV === 'production') {
      throw new Error(
        'CORS_ORIGIN must contain an explicit comma-separated allowlist in production.',
      );
    }
    return [...LOCAL_ORIGINS];
  }

  return [...new Set(configuredOrigins.map(validateOrigin))];
}

function validateOrigin(origin: string): string {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error(`Invalid CORS origin: ${origin}`);
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(`CORS origin must be a plain HTTP(S) origin: ${origin}`);
  }
  return url.origin;
}
