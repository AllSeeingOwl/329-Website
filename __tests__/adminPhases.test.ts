/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';

// Mocks for Upstash Redis
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockLpush = jest.fn();
const mockDel = jest.fn();

jest.mock('@upstash/redis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => {
      return {
        set: (...args: any[]) => mockSet(...args),
        get: (...args: any[]) => mockGet(...args),
        lpush: (...args: any[]) => mockLpush(...args),
        del: (...args: any[]) => mockDel(...args),
      };
    }),
  };
});

import app from '../server';
import { createAdminSession } from '../src/middleware/adminAuth';
import { resetInMemPhases } from '../src/routes/admin';

describe('Admin Phase & Tier Management API Endpoints', () => {
  let authToken: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    resetInMemPhases();

    // Create a valid session for authentication in tests
    const session = await createAdminSession('127.0.0.1');
    authToken = session?.token || '';
  });

  describe('Authentication Enforcement', () => {
    it('returns 401 Unauthorized for GET /api/admin/phases without auth header', async () => {
      const response = await request(app).get('/api/admin/phases');
      (expect as any)(response.status).toBe(401);
      (expect as any)(response.body).toHaveProperty('error');
    });

    it('returns 401 Unauthorized for POST /api/admin/phases/activate without auth header', async () => {
      const response = await request(app)
        .post('/api/admin/phases/activate')
        .send({ phaseId: 'phase-1-5-email-1' });
      (expect as any)(response.status).toBe(401);
    });

    it('returns 401 Unauthorized for PUT /api/admin/phases/:phaseId without auth header', async () => {
      const response = await request(app)
        .put('/api/admin/phases/phase-1-5-email-1')
        .send({ name: 'Updated Phase' });
      (expect as any)(response.status).toBe(401);
    });

    it('returns 401 Unauthorized for DELETE /api/admin/phases/:phaseId/deactivate without auth header', async () => {
      const response = await request(app).delete('/api/admin/phases/phase-1-5-email-1/deactivate');
      (expect as any)(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/phases', () => {
    it('returns all phases and lock status when authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/phases')
        .set('Authorization', `Bearer ${authToken}`);

      (expect as any)(response.status).toBe(200);
      (expect as any)(response.body.success).toBe(true);
      (expect as any)(Array.isArray(response.body.phases)).toBe(true);
      (expect as any)(response.body.phases.length).toBeGreaterThanOrEqual(4);

      const firstPhase = response.body.phases[0];
      (expect as any)(firstPhase).toHaveProperty('id');
      (expect as any)(firstPhase).toHaveProperty('name');
      (expect as any)(firstPhase).toHaveProperty('tier');
      (expect as any)(firstPhase).toHaveProperty('active');
      (expect as any)(firstPhase).toHaveProperty('relatedContent');
    });
  });

  describe('POST /api/admin/phases/activate', () => {
    it('activates a phase successfully and sets timestamp', async () => {
      const response = await request(app)
        .post('/api/admin/phases/activate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phaseId: 'phase-1-5-email-1', adminUser: 'test_admin' });

      (expect as any)(response.status).toBe(200);
      (expect as any)(response.body.success).toBe(true);
      (expect as any)(response.body.phase.id).toBe('phase-1-5-email-1');
      (expect as any)(response.body.phase.active).toBe(true);
      (expect as any)(response.body.phase.activatedAt).toBeDefined();
      (expect as any)(response.body.phase.lastModifiedBy).toBe('test_admin');

      // Verify persistence via GET
      const getRes = await request(app)
        .get('/api/admin/phases')
        .set('Authorization', `Bearer ${authToken}`);
      const activated = getRes.body.phases.find((p: any) => p.id === 'phase-1-5-email-1');
      (expect as any)(activated.active).toBe(true);
    });

    it('returns 400 Bad Request when phaseId is missing', async () => {
      const response = await request(app)
        .post('/api/admin/phases/activate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      (expect as any)(response.status).toBe(400);
      (expect as any)(response.body.success).toBe(false);
      (expect as any)(response.body.message).toMatch(/Invalid phase data/i);
    });

    it('returns 400 Bad Request when phaseId does not exist', async () => {
      const response = await request(app)
        .post('/api/admin/phases/activate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ phaseId: 'non-existent-phase-xyz' });

      (expect as any)(response.status).toBe(400);
      (expect as any)(response.body.success).toBe(false);
      (expect as any)(response.body.message).toMatch(/not found/i);
    });
  });

  describe('PUT /api/admin/phases/:phaseId', () => {
    it('updates phase configuration successfully', async () => {
      const response = await request(app)
        .put('/api/admin/phases/phase-1-5-email-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Email Drip #1',
          tier: 2,
          relatedContent: ['ollies-radio-scanner.html', 'extra-doc.html'],
          adminUser: 'editor_admin',
        });

      (expect as any)(response.status).toBe(200);
      (expect as any)(response.body.success).toBe(true);
      (expect as any)(response.body.phase.name).toBe('Updated Email Drip #1');
      (expect as any)(response.body.phase.tier).toBe(2);
      (expect as any)(response.body.phase.relatedContent).toEqual([
        'ollies-radio-scanner.html',
        'extra-doc.html',
      ]);
      (expect as any)(response.body.phase.lastModifiedBy).toBe('editor_admin');
    });

    it('returns 400 Bad Request for invalid tier value', async () => {
      const response = await request(app)
        .put('/api/admin/phases/phase-1-5-email-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tier: 5 });

      (expect as any)(response.status).toBe(400);
      (expect as any)(response.body.success).toBe(false);
      (expect as any)(response.body.message).toMatch(/tier must be a number between 1 and 3/i);
    });

    it('returns 400 Bad Request for non-existent phaseId', async () => {
      const response = await request(app)
        .put('/api/admin/phases/invalid-phase-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Name' });

      (expect as any)(response.status).toBe(400);
      (expect as any)(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/phases/:phaseId/deactivate', () => {
    it('deactivates an active phase successfully', async () => {
      const response = await request(app)
        .delete('/api/admin/phases/phase-1-zine-launch/deactivate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ adminUser: 'deactivator_admin' });

      (expect as any)(response.status).toBe(200);
      (expect as any)(response.body.success).toBe(true);
      (expect as any)(response.body.phase.id).toBe('phase-1-zine-launch');
      (expect as any)(response.body.phase.active).toBe(false);
      (expect as any)(response.body.phase.lastModifiedBy).toBe('deactivator_admin');

      // Verify persistence via GET
      const getRes = await request(app)
        .get('/api/admin/phases')
        .set('Authorization', `Bearer ${authToken}`);
      const deactivated = getRes.body.phases.find((p: any) => p.id === 'phase-1-zine-launch');
      (expect as any)(deactivated.active).toBe(false);
    });

    it('returns 400 Bad Request when trying to deactivate non-existent phase', async () => {
      const response = await request(app)
        .delete('/api/admin/phases/unknown-phase/deactivate')
        .set('Authorization', `Bearer ${authToken}`);

      (expect as any)(response.status).toBe(400);
      (expect as any)(response.body.success).toBe(false);
    });
  });
});
