/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import app from '../server';
import { clearAllEmails, getAllEmails } from '../db';
import { redis, isRedisAvailable } from '../src/redis';
import { resetInMemConfig } from '../src/routes/admin';

describe('POST /api/emails/collect', () => {
  beforeEach(async () => {
    await clearAllEmails();
    resetInMemConfig();
    if (typeof (app as any).resetEmailRateLimitMap === 'function') {
      (app as any).resetEmailRateLimitMap();
    }
    if (isRedisAvailable()) {
      try {
        await redis.del('config:system');
      } catch {
        // Ignore redis cleanup error in test
      }
    }
  });

  afterEach(async () => {
    await clearAllEmails();
    resetInMemConfig();
    if (typeof (app as any).resetEmailRateLimitMap === 'function') {
      (app as any).resetEmailRateLimitMap();
    }
    if (isRedisAvailable()) {
      try {
        await redis.del('config:system');
      } catch {
        // Ignore redis cleanup error in test
      }
    }
  });

  it('should successfully collect email when request is valid', async () => {
    const res = await request(app)
      .post('/api/emails/collect')
      .send({ email: 'validuser@example.com', source: 'studio_newsletter' });

    (expect as any)(res.status).toBe(200);
    (expect as any)(res.body).toEqual({ success: true });

    const emails = await getAllEmails();
    (expect as any)(emails.length).toBe(1);
    (expect as any)(emails[0].email).toBe('validuser@example.com');
    (expect as any)(emails[0].source).toBe('studio_newsletter');
  });

  it('should return 400 when email or source is missing', async () => {
    const res1 = await request(app)
      .post('/api/emails/collect')
      .send({ source: 'studio_newsletter' });
    (expect as any)(res1.status).toBe(400);
    (expect as any)(res1.body.error).toMatch(/Email and source are required/);

    const res2 = await request(app).post('/api/emails/collect').send({ email: 'user@example.com' });
    (expect as any)(res2.status).toBe(400);
    (expect as any)(res2.body.error).toMatch(/Email and source are required/);
  });

  it('should return 400 when email or source are non-string types or empty strings', async () => {
    const res1 = await request(app)
      .post('/api/emails/collect')
      .send({ email: 12345, source: 'studio_newsletter' });
    (expect as any)(res1.status).toBe(400);

    const res2 = await request(app)
      .post('/api/emails/collect')
      .send({ email: '   ', source: 'studio_newsletter' });
    (expect as any)(res2.status).toBe(400);
  });

  it('should return 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/emails/collect')
      .send({ email: 'not-an-email', source: 'studio_newsletter' });

    (expect as any)(res.status).toBe(400);
    (expect as any)(res.body.error).toBe('Invalid email format');
  });

  it('should return 400 when input length exceeds maximum limit', async () => {
    const longEmail = `${'a'.repeat(250)}@example.com`;
    const res = await request(app)
      .post('/api/emails/collect')
      .send({ email: longEmail, source: 'studio_newsletter' });

    (expect as any)(res.status).toBe(400);
    (expect as any)(res.body.error).toBe('Input length exceeds allowable limit');
  });

  it('should return 403 when allowEmailCollection is set to false in system config', async () => {
    const loginRes = await request(app).post('/api/admin/authenticate').send({ password: 'admin' });
    const cookie = loginRes.headers['set-cookie'];

    const configRes = await request(app).put('/api/admin/config').set('Cookie', cookie).send({
      maintenanceMode: false,
      publicSiteEnabled: true,
      adminPanelEnabled: true,
      allowEmailCollection: false,
      emailNotificationEnabled: true,
      maxConcurrentSessions: 10,
      sessionTimeout: 15,
      emergencyLockdown: false,
    });

    (expect as any)(configRes.status).toBe(200);

    const collectRes = await request(app)
      .post('/api/emails/collect')
      .send({ email: 'user@example.com', source: 'studio_newsletter' });

    (expect as any)(collectRes.status).toBe(403);
    (expect as any)(collectRes.body.error).toBe('Email collection is currently disabled.');
  });

  it('should return 429 when rate limit is exceeded for email collection', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/emails/collect')
        .send({ email: `user${i}@example.com`, source: 'studio_newsletter' });
      (expect as any)(res.status).toBe(200);
    }

    const rateLimitedRes = await request(app)
      .post('/api/emails/collect')
      .send({ email: 'user10@example.com', source: 'studio_newsletter' });

    (expect as any)(rateLimitedRes.status).toBe(429);
    (expect as any)(rateLimitedRes.body.error).toBe(
      'Too many email collection requests, please try again later.'
    );
  });
});
