/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */

describe('src/redis.ts tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isRedisAvailable', () => {
    it('returns true when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set', async () => {
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
      process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-upstash-token';

      const { isRedisAvailable } = await import('../src/redis');
      (expect as any)(isRedisAvailable()).toBe(true);
    });

    it('returns true when KV_REST_API_URL and KV_REST_API_TOKEN are set', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.KV_REST_API_URL = 'https://mock-kv.com';
      process.env.KV_REST_API_TOKEN = 'mock-kv-token';

      const { isRedisAvailable } = await import('../src/redis');
      (expect as any)(isRedisAvailable()).toBe(true);
    });

    it('returns false when no Redis environment variables are set', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;

      const { isRedisAvailable } = await import('../src/redis');
      (expect as any)(isRedisAvailable()).toBe(false);
    });
  });

  describe('validateProductionRedisConfig', () => {
    it('logs warning in production when Redis environment variables are missing', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { validateProductionRedisConfig } = await import('../src/redis');
      process.env.NODE_ENV = 'production';
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;

      (expect as any)(() => validateProductionRedisConfig()).not.toThrow();
      (expect as any)(consoleSpy).toHaveBeenCalledWith(
        (expect as any).stringMatching(/WARNING: Missing required Upstash Redis environment variables/)
      );
      consoleSpy.mockRestore();
    });

    it('does not log warning in production when Redis environment variables are provided', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { validateProductionRedisConfig } = await import('../src/redis');
      process.env.NODE_ENV = 'production';
      process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-upstash-token';

      (expect as any)(() => validateProductionRedisConfig()).not.toThrow();
      (expect as any)(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('does not log warning in non-production when Redis environment variables are missing', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
      process.env.NODE_ENV = 'development';

      const { validateProductionRedisConfig } = await import('../src/redis');
      (expect as any)(() => validateProductionRedisConfig()).not.toThrow();
      (expect as any)(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('createRedisClient and module export', () => {
    it('creates a Redis client instance without throwing in development mode', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;

      const { redis, createRedisClient } = await import('../src/redis');
      (expect as any)(redis).toBeDefined();
      (expect as any)(typeof createRedisClient).toBe('function');
    });

    it('logs warning on module load in production if Redis variables are missing without throwing', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      process.env.NODE_ENV = 'production';
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;

      const { redis } = await import('../src/redis');
      (expect as any)(redis).toBeDefined();
      (expect as any)(consoleSpy).toHaveBeenCalledWith(
        (expect as any).stringMatching(/WARNING: Missing required Upstash Redis environment variables/)
      );
      consoleSpy.mockRestore();
    });
  });
});
