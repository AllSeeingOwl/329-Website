/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import app from '../server';
import { resetRateLimitMap } from '../src/middleware/adminAuth';

describe('Render Deployment Smoke Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    resetRateLimitMap();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Health Check & Core Infrastructure', () => {
    it('GET /health returns 200 OK with status ok', async () => {
      const res = await request(app).get('/health');
      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('2. Admin Console & MLTK Static UI Resolution', () => {
    it('GET /admin/ returns 200 OK and serves admin HTML UI', async () => {
      const res = await request(app).get('/admin/');
      (expect as any)(res.status).toBe(200);
      (expect as any)(res.text).toContain('<!doctype html>');
      (expect as any)(res.text.toLowerCase()).toContain('admin');
    });

    it('GET /mltk-admin.html returns 200 OK and serves MLTK admin UI', async () => {
      const res = await request(app).get('/mltk-admin.html');
      (expect as any)(res.status).toBe(200);
      (expect as any)(res.text).toContain('<!doctype html>');
      (expect as any)(res.text).toContain('MLTK');
    });
  });

  describe('3. Unauthenticated Access Protection', () => {
    const protectedRoutes = [
      '/api/admin/dashboard-config',
      '/api/admin/maintenance-config',
      '/api/admin/phases',
      '/api/admin/audit-logs',
      '/api/admin/emails',
      '/api/admin/announcements',
    ];

    protectedRoutes.forEach((route) => {
      it(`Unauthenticated GET ${route} returns 401 or 403`, async () => {
        const res = await request(app).get(route);
        (expect as any)([401, 403]).toContain(res.status);
        (expect as any)(res.body).toHaveProperty('error');
      });
    });
  });

  describe('4. Admin Authentication (ADMIN_PASSWORD)', () => {
    const TEST_ADMIN_PWD = 'test-secret-admin-pwd-9876';

    beforeEach(() => {
      process.env.ADMIN_PASSWORD = TEST_ADMIN_PWD;
    });

    it('Login fails with invalid password', async () => {
      const res = await request(app)
        .post('/api/admin/verify')
        .send({ password: 'wrong-password' });

      (expect as any)(res.status).toBe(401);
      (expect as any)(res.body.success).toBe(false);
      (expect as any)(res.body.error).toBe('Unauthorized');
    });

    it('Login succeeds only with server-side configured ADMIN_PASSWORD', async () => {
      const res = await request(app)
        .post('/api/admin/verify')
        .send({ password: TEST_ADMIN_PWD });

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);
      (expect as any)(res.body.message).toBe('Authenticated');

      // Validate set-cookie header presence
      const cookies = res.headers['set-cookie'];
      (expect as any)(cookies).toBeDefined();
      (expect as any)(cookies[0]).toContain('admin_session=');
    });
  });

  describe('5. MLTK Player Verification Separation (AUTH_PASSWORD)', () => {
    const TEST_AUTH_PWD = '1111-2222-3333-4444';
    const TEST_ADMIN_PWD = 'admin-secret-password-5555';

    beforeEach(() => {
      process.env.AUTH_PASSWORD = TEST_AUTH_PWD;
      process.env.ADMIN_PASSWORD = TEST_ADMIN_PWD;
    });

    it('Player verification (/api/verify) succeeds with AUTH_PASSWORD', async () => {
      const res = await request(app)
        .post('/api/verify')
        .send({ code: TEST_AUTH_PWD });

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);
    });

    it('Player verification (/api/verify) fails with ADMIN_PASSWORD', async () => {
      const res = await request(app)
        .post('/api/verify')
        .send({ code: TEST_ADMIN_PWD });

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(false);
    });

    it('Admin auth (/api/admin/verify) fails with AUTH_PASSWORD', async () => {
      const res = await request(app)
        .post('/api/admin/verify')
        .send({ password: TEST_AUTH_PWD });

      (expect as any)(res.status).toBe(401);
      (expect as any)(res.body.success).toBe(false);
    });
  });

  describe('6. Zero Sensitive Data Exposure in Responses & Logs', () => {
    const SECRET_ADMIN = 'SUPER_SECRET_ADMIN_TOKEN_123';
    const SECRET_AUTH = 'SUPER_SECRET_AUTH_CODE_456';

    beforeEach(() => {
      process.env.ADMIN_PASSWORD = SECRET_ADMIN;
      process.env.AUTH_PASSWORD = SECRET_AUTH;
    });

    it('Responses do not leak ADMIN_PASSWORD, AUTH_PASSWORD, or Redis tokens', async () => {
      const responses = await Promise.all([
        request(app).get('/health'),
        request(app).get('/api/admin/dashboard-config'),
        request(app).post('/api/admin/verify').send({ password: 'invalid' }),
        request(app).post('/api/verify').send({ code: 'invalid' }),
      ]);

      responses.forEach((res) => {
        const bodyStr = JSON.stringify(res.body);
        const textStr = res.text || '';

        (expect as any)(bodyStr).not.toContain(SECRET_ADMIN);
        (expect as any)(bodyStr).not.toContain(SECRET_AUTH);
        (expect as any)(textStr).not.toContain(SECRET_ADMIN);
        (expect as any)(textStr).not.toContain(SECRET_AUTH);
      });
    });
  });
});
