import { Redis } from '@upstash/redis';

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
