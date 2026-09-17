/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import app from '../server';
import { resetRateLimitMap } from '../src/middleware/adminAuth';

const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();
const mockLpush = jest.fn();
const mockLtrim = jest.fn();
const mockLrange = jest.fn();

jest.mock('@upstash/redis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => {
      return {
        set: (...args: any[]) => mockSet(...args),
        get: (...args: any[]) => mockGet(...args),
        del: (...args: any[]) => mockDel(...args),
        lpush: (...args: any[]) => mockLpush(...args),
        ltrim: (...args: any[]) => mockLtrim(...args),
        lrange: (...args: any[]) => mockLrange(...args),
      };
    }),
  };
});

describe('Emergency Lockdown Toggle Endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimitMap();
    process.env = { ...originalEnv };
    process.env.KV_REST_API_URL = 'https://test-kv.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-token';
    process.env.ADMIN_PASSWORD = 'super-secret-admin-pass';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const loginAdmin = async () => {
    mockSet.mockResolvedValue('OK');
    const authRes = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: 'super-secret-admin-pass' });

    const token = authRes.body.token || 'test-token';
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15).toISOString();

    mockGet.mockImplementation(async (key: string) => {
      if (typeof key === 'string' && key.startsWith('admin:session:')) {
        return JSON.stringify({
          token,
          createdAt: new Date().toISOString(),
          expiresAt,
        });
      }
      return null;
    });

    const cookies = authRes.headers['set-cookie'] as unknown as string[];
    return cookies;
  };

  it('rejects unauthenticated POST /api/admin/lockdown/toggle', async () => {
    const res = await request(app).post('/api/admin/lockdown/toggle');
    (expect as any)(res.status).toBe(401);
  });

  it('toggles emergency lockdown state when authenticated', async () => {
    const cookies = await loginAdmin();

    const res = await request(app)
      .post('/api/admin/lockdown/toggle')
      .set('Cookie', cookies)
      .send({ enabled: true });

    (expect as any)(res.status).toBe(200);
    (expect as any)(res.body.success).toBe(true);
    (expect as any)(res.body.emergencyLockdown).toBe(true);
  });
});
