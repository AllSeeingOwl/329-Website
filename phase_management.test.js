const request = require('supertest');

describe('Phase & Tier Management API Tests', () => {
  let app;
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
    process.env.ADMIN_PASSWORD = 'admin_test_password';
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  it('GET /api/phases should return the active phase ID and list of phases', async () => {
    app = require('./server');
    const response = await request(app).get('/api/phases').expect(200);

    expect(response.body).toHaveProperty('activePhaseId');
    expect(response.body).toHaveProperty('phases');
    expect(Array.isArray(response.body.phases)).toBe(true);
    expect(response.body.phases.length).toBe(4);
  });

  it('GET /api/dashboard-config should return activePhaseId and config', async () => {
    app = require('./server');
    const response = await request(app).get('/api/dashboard-config').expect(200);

    expect(response.body).toHaveProperty('activePhaseId');
    expect(response.body).toHaveProperty('config');
    expect(Array.isArray(response.body.config)).toBe(true);
  });

  it('POST /api/admin/phases/set should allow admin to change active phase', async () => {
    app = require('./server');

    // Authenticate admin
    const authRes = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'admin_test_password' })
      .expect(200);

    const token = authRes.body.token;

    // Set active phase to phase1_5_email1
    const setRes = await request(app)
      .post('/api/admin/phases/set')
      .set('Authorization', `Bearer ${token}`)
      .send({ phaseId: 'phase1_5_email1' })
      .expect(200);

    expect(setRes.body).toEqual({ success: true, activePhaseId: 'phase1_5_email1' });

    // Verify GET /api/phases returns updated activePhaseId
    const phasesRes = await request(app).get('/api/phases').expect(200);
    expect(phasesRes.body.activePhaseId).toBe('phase1_5_email1');
  });

  it('POST /api/admin/phases/set should return 400 for invalid phaseId', async () => {
    app = require('./server');

    const authRes = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'admin_test_password' })
      .expect(200);

    const token = authRes.body.token;

    const setRes = await request(app)
      .post('/api/admin/phases/set')
      .set('Authorization', `Bearer ${token}`)
      .send({ phaseId: 'invalid_phase_99' })
      .expect(400);

    expect(setRes.body).toHaveProperty('error', 'Invalid phaseId');
  });

  it('POST /api/admin/phases/set should return 400 for non-string or oversized phaseId', async () => {
    app = require('./server');

    const authRes = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'admin_test_password' })
      .expect(200);

    const token = authRes.body.token;

    // Test non-string phaseId
    const nonStringRes = await request(app)
      .post('/api/admin/phases/set')
      .set('Authorization', `Bearer ${token}`)
      .send({ phaseId: 12345 })
      .expect(400);

    expect(nonStringRes.body).toHaveProperty(
      'error',
      'phaseId is required as a non-empty string'
    );

    // Test oversized phaseId
    const oversizedRes = await request(app)
      .post('/api/admin/phases/set')
      .set('Authorization', `Bearer ${token}`)
      .send({ phaseId: 'a'.repeat(101) })
      .expect(400);

    expect(oversizedRes.body).toHaveProperty(
      'error',
      'phaseId length exceeds allowable limit'
    );
  });
});
