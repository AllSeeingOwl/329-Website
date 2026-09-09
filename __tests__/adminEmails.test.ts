/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import app from '../server';
import { clearAllEmails, saveEmail, getAllEmails } from '../db';

describe('Admin Email Endpoints (/api/admin/emails)', () => {
  let sessionCookie: string;

  beforeAll(async () => {
    // Authenticate to get session cookie
    const authRes = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: process.env.ADMIN_PASSWORD || 'admin' });

    (expect as any)(authRes.status).toBe(200);
    const cookies = authRes.headers['set-cookie'];
    if (cookies && Array.isArray(cookies)) {
      sessionCookie = cookies[0];
    } else if (typeof cookies === 'string') {
      sessionCookie = cookies;
    }
  });

  beforeEach(async () => {
    await clearAllEmails();
  });

  afterAll(async () => {
    await clearAllEmails();
  });

  describe('GET /api/admin/emails', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/admin/emails');
      (expect as any)(res.status).toBe(401);
    });

    it('should return empty list when no emails exist', async () => {
      const res = await request(app).get('/api/admin/emails').set('Cookie', sessionCookie);

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);
      (expect as any)(res.body.count).toBe(0);
      (expect as any)(res.body.emails).toEqual([]);
    });

    it('should return all collected emails with required fields', async () => {
      await saveEmail('user1@example.com', 'studio_newsletter', 'verified');
      await saveEmail('user2@example.com', 'mltk_access', 'pending');

      const res = await request(app).get('/api/admin/emails').set('Cookie', sessionCookie);

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);
      (expect as any)(res.body.count).toBe(2);

      const emails = res.body.emails;
      (expect as any)(emails.length).toBe(2);

      const user1 = emails.find((e: any) => e.email === 'user1@example.com');
      (expect as any)(user1).toBeDefined();
      (expect as any)(user1.source).toBe('studio_newsletter');
      (expect as any)(user1.status).toBe('verified');
      (expect as any)(user1.collectedAt).toBeDefined();
      (expect as any)(user1.phase).toBeDefined();
    });
  });

  describe('GET /api/admin/emails/export', () => {
    it('should reject unauthenticated export requests', async () => {
      const res = await request(app).get('/api/admin/emails/export');
      (expect as any)(res.status).toBe(401);
    });

    it('should export CSV with headers: Email, Collected At, Source Phase, Status', async () => {
      await saveEmail('csv_user@example.com', 'test_source', 'verified');

      const res = await request(app).get('/api/admin/emails/export').set('Cookie', sessionCookie);

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.headers['content-type']).toContain('text/csv');
      (expect as any)(res.headers['content-disposition']).toContain(
        'attachment; filename="collected_emails.csv"'
      );

      const csvLines = res.text.trim().split('\n');
      (expect as any)(csvLines[0]).toBe('"Email","Collected At","Source Phase","Status"');
      (expect as any)(csvLines[1]).toContain('"csv_user@example.com"');
      (expect as any)(csvLines[1]).toContain('"test_source"');
      (expect as any)(csvLines[1]).toContain('"verified"');
    });
  });

  describe('POST /api/admin/emails/clear', () => {
    it('should reject unauthenticated clear requests', async () => {
      const res = await request(app).post('/api/admin/emails/clear');
      (expect as any)(res.status).toBe(401);
    });

    it('should reject clear request without confirmation parameter', async () => {
      await saveEmail('toclear@example.com', 'studio_newsletter');

      const res = await request(app).post('/api/admin/emails/clear').set('Cookie', sessionCookie);

      (expect as any)(res.status).toBe(400);
      (expect as any)(res.body.success).toBe(false);
      (expect as any)(res.body.message).toContain('Confirmation parameter required');

      // Verify emails were not cleared
      const emails = await getAllEmails();
      (expect as any)(emails.length).toBe(1);
    });

    it('should clear emails when query confirmation parameter confirm=true is provided', async () => {
      await saveEmail('toclear1@example.com', 'studio_newsletter');
      await saveEmail('toclear2@example.com', 'mltk_access');

      const res = await request(app)
        .post('/api/admin/emails/clear?confirm=true')
        .set('Cookie', sessionCookie);

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);
      (expect as any)(res.body.clearedCount).toBe(2);

      const emails = await getAllEmails();
      (expect as any)(emails.length).toBe(0);
    });

    it('should clear emails when body confirmation { confirm: true } is provided', async () => {
      await saveEmail('toclear1@example.com', 'studio_newsletter');

      const res = await request(app)
        .post('/api/admin/emails/clear')
        .set('Cookie', sessionCookie)
        .send({ confirm: true });

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);
      (expect as any)(res.body.clearedCount).toBe(1);

      const emails = await getAllEmails();
      (expect as any)(emails.length).toBe(0);
    });
  });

  describe('GET /api/admin/emails/stats', () => {
    it('should reject unauthenticated stats requests', async () => {
      const res = await request(app).get('/api/admin/emails/stats');
      (expect as any)(res.status).toBe(401);
    });

    it('should return email statistics breakdown', async () => {
      await saveEmail('stat1@example.com', 'studio_newsletter', 'verified');
      await saveEmail('stat2@example.com', 'studio_newsletter', 'pending');
      await saveEmail('stat3@example.com', 'mltk_access', 'bounced');

      const res = await request(app).get('/api/admin/emails/stats').set('Cookie', sessionCookie);

      (expect as any)(res.status).toBe(200);
      (expect as any)(res.body.success).toBe(true);
      (expect as any)(res.body.total).toBe(3);
      (expect as any)(res.body.bySource.studio_newsletter).toBe(2);
      (expect as any)(res.body.bySource.mltk_access).toBe(1);
      (expect as any)(res.body.byStatus.verified).toBe(1);
      (expect as any)(res.body.byStatus.pending).toBe(1);
      (expect as any)(res.body.byStatus.bounced).toBe(1);
      (expect as any)(Object.keys(res.body.byDate).length).toBeGreaterThan(0);
    });
  });
});
