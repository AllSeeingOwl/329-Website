/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getRedisCredentials,
  isRedisConfigured,
  validateProductionRedisConfig,
} from '../src/redis';

describe('Redis Configuration and Storage Behavior', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('prefers UPSTASH_REDIS_REST_* over KV_REST_API_* when both are provided', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.preferred.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'preferred-token';
    process.env.KV_REST_API_URL = 'https://kv.fallback.com';
    process.env.KV_REST_API_TOKEN = 'fallback-token';

    const creds = getRedisCredentials();
    (expect as any)(creds.url).toBe('https://upstash.preferred.com');
    (expect as any)(creds.token).toBe('preferred-token');
  });

  it('falls back to KV_REST_API_* if UPSTASH_REDIS_REST_* is missing', () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.KV_REST_API_URL = 'https://kv.fallback.com';
    process.env.KV_REST_API_TOKEN = 'fallback-token';

    const creds = getRedisCredentials();
    (expect as any)(creds.url).toBe('https://kv.fallback.com');
    (expect as any)(creds.token).toBe('fallback-token');
  });

  it('detects when Redis is properly configured', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    (expect as any)(isRedisConfigured()).toBe(true);

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.KV_REST_API_URL;
    (expect as any)(isRedisConfigured()).toBe(false);
  });

  it('throws a clear error in production if required Redis variables are missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    (expect as any)(() => validateProductionRedisConfig()).toThrow(
      /Missing required Upstash Redis environment variables/
    );
  });

  it('does not throw in development or test environment when variables are missing', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    (expect as any)(() => validateProductionRedisConfig()).not.toThrow();
  });
});
