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

export const isRedisAvailable = (): boolean => {
  return isRedisConfigured();
};

/**
 * Ensures Redis configuration is checked in production environment.
 * Logs a warning in production if required Redis variables are missing, allowing in-memory fallback.
 */
export const validateProductionRedisConfig = (): void => {
  if (process.env.NODE_ENV === 'production' && !isRedisAvailable()) {
    console.warn(
      'WARNING: Missing required Upstash Redis environment variables ' +
        '(UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL and KV_REST_API_TOKEN). ' +
        'Falling back to in-memory store.'
    );
  }
};

/**
 * Creates an Upstash Redis client instance using standardized environment variable resolution.
 */
export const createRedisClient = (): Redis => {
  validateProductionRedisConfig();

  const { url: credUrl, token: credToken } = getRedisCredentials();
  const url = credUrl || 'https://placeholder.upstash.io';
  const token = credToken || 'placeholder-token';

  return new Redis({ url, token });
};

export const redis = createRedisClient();
