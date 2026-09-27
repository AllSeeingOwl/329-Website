/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import request from 'supertest';
import app from '../server';
import fs from 'fs';
import path from 'path';

describe('QR Code Route & Entry Point Verification', () => {
  const qrRoutes = [
    '/',
    '/surface-home-page',
    '/mltk-login-gate',
    '/mltk-surveillance-dashboard',
    '/mltk-virtue-village-index',
    '/mltk-five-finger-wheel',
    '/mltk-3d-map',
    '/mltk-classified-document',
    '/system-override',
    '/nova-classified-archive',
    '/nova-parent-directory',
    '/team-rabbit-hack',
    '/secure-data-drop-page',
    '/ollies-radio-scanner',
    '/velvet-rope-landing-page',
    '/in-universe-404-error',
  ];

  qrRoutes.forEach((route) => {
    it(`should serve QR entry point route ${route} with 200 OK`, async () => {
      const res = await request(app).get(route);
      (expect(res.status) as any).toBe(200);
      (expect(res.text) as any).toBeTruthy();
    });

    if (route !== '/') {
      it(`should 301 redirect legacy route ${route}.html to clean route ${route}`, async () => {
        const res = await request(app).get(`${route}.html`);
        (expect(res.status) as any).toBe(301);
        (expect(res.headers.location) as any).toBe(route);
      });
    }
  });

  it('should serve static QR code asset system_override_qr.png', async () => {
    const res = await request(app).get('/system_override_qr.png');
    (expect(res.status) as any).toBe(200);
    (expect(res.headers['content-type']) as any).toMatch(/image\/png/);
  });

  it('should verify that QR Code documentation and phased rollout guide exist', () => {
    const docPath = path.join(__dirname, '../QR_CODE_ENTRY_POINTS.md');
    (expect(fs.existsSync(docPath)) as any).toBe(true);
    const content = fs.readFileSync(docPath, 'utf8');
    (expect(content) as any).toContain('QR Code Entry Points');
    (expect(content) as any).toContain('Dynamic vs. Static QR Codes Strategy');
    (expect(content) as any).toContain('Phased Rollout Roadmap');
    (expect(content) as any).toContain('Phase 1: Launch');
    (expect(content) as any).toContain('Phase 2: Mid-Game');
    (expect(content) as any).toContain('Phase 3: Endgame');
  });
});
