/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import app from '../server';
import { resetRateLimitMap } from '../src/middleware/adminAuth';

const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();

jest.mock('@upstash/redis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => {
      return {
        set: (...args: any[]) => mockSet(...args),
        get: (...args: any[]) => mockGet(...args),
        del: (...args: any[]) => mockDel(...args),
      };
    }),
  };
});

describe('Admin Authentication & Route Security Integration Tests', () => {
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

  describe('Secret Bypass Key Authentication', () => {
    beforeEach(() => {
      process.env.ADMIN_BYPASS_KEY = 'secret-bypass-key-2084';
    });

    it('authenticates successfully via GET /api/admin/quick-login?key=...', async () => {
      mockSet.mockResolvedValue('OK');

      const res = await request(app).get('/api/admin/quick-login?key=secret-bypass-key-2084');

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      (expect as any)(cookies).toBeDefined();
      const adminCookie = cookies.find((c: string) => c.startsWith('admin_session='));
      (expect as any)(adminCookie).toBeDefined();
    });

    it('redirects HTML browser request to /admin/ on GET /api/admin/quick-login?key=...', async () => {
      mockSet.mockResolvedValue('OK');

      const res = await request(app)
        .get('/api/admin/quick-login?key=secret-bypass-key-2084')
        .set('Accept', 'text/html');

      (expect as any)(res.status).toBe(302);
      (expect as any)(res.headers.location).toBe('/admin/');
    });

    it('authenticates via POST /api/admin/authenticate using bypass key in password field', async () => {
      mockSet.mockResolvedValue('OK');

      const res = await request(app)
        .post('/api/admin/authenticate')
        .send({ password: 'secret-bypass-key-2084' });

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);
    });

    it('rejects invalid bypass key (401)', async () => {
      const res = await request(app).get('/api/admin/quick-login?key=wrong-bypass-key');

      (expect as any)(res.status).toBe(401);
      (expect as any)(res.body.success).toBe(false);
    });
  });

  describe('Login & Password Handling', () => {
    it('authenticates successfully with valid password and sets HttpOnly cookie', async () => {
      mockSet.mockResolvedValue('OK');

      const res = await request(app)
        .post('/api/admin/authenticate')
        .send({ password: 'super-secret-admin-pass' });

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);
      (expect as any)(res.body.message).toBe('Authenticated');

      const cookies = res.headers['set-cookie'] as unknown as string[];
      (expect as any)(cookies).toBeDefined();
      const adminCookie = cookies.find((c: string) => c.startsWith('admin_session='));
      (expect as any)(adminCookie).toBeDefined();
      (expect as any)(adminCookie).toContain('HttpOnly');
      (expect as any)(adminCookie).toContain('SameSite=Strict');
    });

    it('rejects authentication with invalid password (401)', async () => {
      const res = await request(app)
        .post('/api/admin/authenticate')
        .send({ password: 'wrong-password' });

      (expect as any)(res.status).toBe(401);
      (expect as any)(res.body.success).toBe(false);
      (expect as any)(res.body.message).toBe('Invalid password');
    });

    it('enforces rate limiting after 5 failed login attempts', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/admin/authenticate')
          .send({ password: 'wrong-password' });
        (expect as any)(res.status).toBe(401);
      }

      const resBlocked = await request(app)
        .post('/api/admin/authenticate')
        .send({ password: 'super-secret-admin-pass' });

      (expect as any)(resBlocked.status).toBe(429);
      (expect as any)(resBlocked.body.success).toBe(false);
      (expect as any)(resBlocked.body.message).toBe(
        'Too many failed login attempts. Please try again later.'
      );
    });

    it('throws error / 500 when ADMIN_PASSWORD is missing in production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ADMIN_PASSWORD;

      const res = await request(app)
        .post('/api/admin/authenticate')
        .send({ password: 'any-password' });

      (expect as any)(res.status).toBe(500);
      (expect as any)(res.body.success).toBe(false);
      (expect as any)(res.body.message).toContain('ADMIN_PASSWORD');
    });
  });

  describe('Session Expiration & Logout', () => {
    it('rejects requests with expired session (401)', async () => {
      const expiredSession = JSON.stringify({
        token: 'expired-token-123',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        expiresAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      });

      mockGet.mockResolvedValue(expiredSession);
      mockDel.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/admin/phases')
        .set('Cookie', ['admin_session=expired-token-123']);

      (expect as any)(res.status).toBe(401);
      (expect as any)(res.body.error).toContain('Unauthorized');
    });

    it('logs out successfully and clears session cookie', async () => {
      mockDel.mockResolvedValue(1);

      const res = await request(app)
        .post('/api/admin/logout')
        .set('Cookie', ['admin_session=active-token-123']);

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      (expect as any)(cookies).toBeDefined();
      const clearedCookie = cookies.find((c: string) => c.startsWith('admin_session=;'));
      (expect as any)(clearedCookie).toBeDefined();
    });
  });

  describe('Protected Admin Route Authorization Controls', () => {
    const protectedRoutes: Array<{ method: 'get' | 'post' | 'put' | 'delete'; path: string }> = [
      { method: 'get', path: '/api/admin/dashboard-config' },
      { method: 'post', path: '/api/admin/dashboard-config' },
      { method: 'post', path: '/api/admin/dashboard-config/all' },
      { method: 'get', path: '/api/admin/maintenance-config' },
      { method: 'post', path: '/api/admin/maintenance-config' },
      { method: 'post', path: '/api/admin/maintenance-config/all' },
      { method: 'get', path: '/api/admin/phases' },
      { method: 'post', path: '/api/admin/phases/set' },
      { method: 'post', path: '/api/admin/phases/activate' },
      { method: 'put', path: '/api/admin/phases/phase-1' },
      { method: 'delete', path: '/api/admin/phases/phase-1/deactivate' },
      { method: 'get', path: '/api/admin/emails' },
      { method: 'get', path: '/api/admin/emails/export' },
      { method: 'post', path: '/api/admin/emails/clear' },
      { method: 'get', path: '/api/admin/emails/stats' },
      { method: 'get', path: '/api/admin/config' },
      { method: 'put', path: '/api/admin/config' },
      { method: 'get', path: '/api/admin/maintenance' },
      { method: 'post', path: '/api/admin/maintenance/toggle' },
      { method: 'get', path: '/api/admin/audit-logs' },
    ];

    protectedRoutes.forEach(({ method, path }) => {
      it(`rejects unauthenticated request to ${method.toUpperCase()} ${path}`, async () => {
        const req = request(app)[method](path);
        const res = await req;

        (expect as any)(res.status).toBe(401);
        (expect as any)(res.body.error || res.body.message).toBeDefined();
      });
    });
  });
});
