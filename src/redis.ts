import { Redis } from '@upstash/redis';

export interface RedisCredentials {
  url: string;
  token: string;
}

/**
 * Resolves the Upstash Redis credentials, preferring UPSTASH_REDIS_REST_* over KV_REST_API_*.
 */
export function getRedisCredentials(): RedisCredentials {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

  return { url, token };
}

/**
 * Checks if valid Redis credentials exist.
 */
export function isRedisConfigured(): boolean {
  const { url, token } = getRedisCredentials();
  return Boolean(url && token);
}

/**
 * Ensures Redis is properly configured in production environment.
 * Throws a clear error if required Redis variables are missing in production.
 */
export function validateProductionRedisConfig(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !isRedisConfigured()) {
    throw new Error(
      'Production configuration error: Missing required Upstash Redis environment variables ' +
        '(UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL and KV_REST_API_TOKEN).'
    );
  }
}

/**
 * Creates an Upstash Redis client instance using standardized environment variable resolution.
 */
export function createRedisClient(): Redis {
  validateProductionRedisConfig();
  const { url, token } = getRedisCredentials();

  return new Redis({
    url,
    token,
  });
}
export const isRedisAvailable = (): boolean => {
  return !!(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  );
};

export const validateProductionRedisConfig = (): void => {
  if (process.env.NODE_ENV === 'production' && !isRedisAvailable()) {
    console.warn(
      'WARNING: Missing required Upstash Redis environment variables ' +
        '(UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL and KV_REST_API_TOKEN). ' +
        'Falling back to in-memory store.'
    );
  }
};

export const createRedisClient = (): Redis => {
  validateProductionRedisConfig();

  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    'https://placeholder.upstash.io';
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || 'placeholder-token';

  return new Redis({ url, token });
};

export const redis = createRedisClient();
