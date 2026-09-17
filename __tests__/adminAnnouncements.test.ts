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

describe('ARG Announcements API Endpoints', () => {
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

  it('rejects unauthenticated GET /api/admin/announcements', async () => {
    const res = await request(app).get('/api/admin/announcements');
    (expect as any)(res.status).toBe(401);
  });

  it('retrieves announcements list when authenticated', async () => {
    const cookies = await loginAdmin();
    const res = await request(app).get('/api/admin/announcements').set('Cookie', cookies);

    (expect as any)(res.status).toBe(200);
    (expect as any)(res.body.success).toBe(true);
    (expect as any)(Array.isArray(res.body.announcements)).toBe(true);
  });

  it('creates a new announcement with validation', async () => {
    const cookies = await loginAdmin();

    // Invalid body (missing title)
    const invalidRes = await request(app)
      .post('/api/admin/announcements')
      .set('Cookie', cookies)
      .send({ title: '', content: 'Some content' });

    (expect as any)(invalidRes.status).toBe(400);

    // Valid creation
    const validRes = await request(app)
      .post('/api/admin/announcements')
      .set('Cookie', cookies)
      .send({
        title: 'EMERGENCY NARRATIVE ALERT',
        content: 'Surveillance nodes breached by RABBIT-HACK.',
        active: true,
      });

    (expect as any)(validRes.status).toBe(201);
    (expect as any)(validRes.body.success).toBe(true);
    (expect as any)(validRes.body.announcement.title).toBe('EMERGENCY NARRATIVE ALERT');
  });

  it('updates an existing announcement', async () => {
    const cookies = await loginAdmin();

    // First create
    const createRes = await request(app)
      .post('/api/admin/announcements')
      .set('Cookie', cookies)
      .send({
        title: 'ORIGINAL TITLE',
        content: 'Original content',
        active: true,
      });

    const annId = createRes.body.announcement.id;

    // Update
    const updateRes = await request(app)
      .put(`/api/admin/announcements/${annId}`)
      .set('Cookie', cookies)
      .send({
        title: 'UPDATED TITLE',
        content: 'Updated content',
        active: false,
      });

    (expect as any)(updateRes.status).toBe(200);
    (expect as any)(updateRes.body.success).toBe(true);
    (expect as any)(updateRes.body.announcement.title).toBe('UPDATED TITLE');
    (expect as any)(updateRes.body.announcement.active).toBe(false);
  });

  it('toggles an announcement active state', async () => {
    const cookies = await loginAdmin();

    const createRes = await request(app)
      .post('/api/admin/announcements')
      .set('Cookie', cookies)
      .send({
        title: 'TOGGLE TEST',
        content: 'Toggle content',
        active: true,
      });

    const annId = createRes.body.announcement.id;

    const toggleRes = await request(app)
      .post(`/api/admin/announcements/${annId}/toggle`)
      .set('Cookie', cookies)
      .send({ active: false });

    (expect as any)(toggleRes.status).toBe(200);
    (expect as any)(toggleRes.body.success).toBe(true);
    (expect as any)(toggleRes.body.announcement.active).toBe(false);
  });

  it('deletes an announcement', async () => {
    const cookies = await loginAdmin();

    const createRes = await request(app)
      .post('/api/admin/announcements')
      .set('Cookie', cookies)
      .send({
        title: 'TO BE DELETED',
        content: 'Temporary content',
        active: true,
      });

    const annId = createRes.body.announcement.id;

    const delRes = await request(app)
      .delete(`/api/admin/announcements/${annId}`)
      .set('Cookie', cookies);

    (expect as any)(delRes.status).toBe(200);
    (expect as any)(delRes.body.success).toBe(true);
  });

  it('serves active public announcements via GET /api/announcements', async () => {
    const res = await request(app).get('/api/announcements');

    (expect as any)(res.status).toBe(200);
    (expect as any)(res.body.success).toBe(true);
    (expect as any)(Array.isArray(res.body.announcements)).toBe(true);
  });
});
