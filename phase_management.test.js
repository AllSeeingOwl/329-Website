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

  it('POST /api/admin/phases/set should allow admin to change active phase and record audit log', async () => {
    app = require('./server');

    // Authenticate admin
    const authRes = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'admin_test_password' })
      .expect(200);

    const token = authRes.body.token;

    // Set active phase to phase1_5_email1 with adminUser parameter
    const setRes = await request(app)
      .post('/api/admin/phases/set')
      .set('Authorization', `Bearer ${token}`)
      .send({ phaseId: 'phase1_5_email1', adminUser: 'sentinel_admin\r\n' })
      .expect(200);

    expect(setRes.body).toEqual({ success: true, activePhaseId: 'phase1_5_email1' });

    // Verify GET /api/phases returns updated activePhaseId
    const phasesRes = await request(app).get('/api/phases').expect(200);
    expect(phasesRes.body.activePhaseId).toBe('phase1_5_email1');

    // Verify audit log entry was created and adminUser was sanitized
    const logsRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(logsRes.body.success).toBe(true);
    const latestLog = logsRes.body.logs[0];
    expect(latestLog.action).toBe('SET_ACTIVE_PHASE');
    expect(latestLog.phaseId).toBe('phase1_5_email1');
    expect(latestLog.adminUser).toBe('sentinel_admin');
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

    expect(nonStringRes.body).toHaveProperty('error', 'phaseId is required as a non-empty string');

    // Test oversized phaseId
    const oversizedRes = await request(app)
      .post('/api/admin/phases/set')
      .set('Authorization', `Bearer ${token}`)
      .send({ phaseId: 'a'.repeat(101) })
      .expect(400);

    expect(oversizedRes.body).toHaveProperty('error', 'phaseId length exceeds allowable limit');
  });

  it('POST /api/admin/phases/activate should return 400 for oversized phaseId', async () => {
    app = require('./server');

    const authRes = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: 'admin_test_password' })
      .expect(200);

    const token = authRes.body.token;

    const oversizedRes = await request(app)
      .post('/api/admin/phases/activate')
      .set('Authorization', `Bearer ${token}`)
      .send({ phaseId: 'b'.repeat(101) })
      .expect(400);

    expect(oversizedRes.body).toHaveProperty('success', false);
    expect(oversizedRes.body).toHaveProperty(
      'message',
      'Invalid phase data: phaseId length exceeds allowable limit'
    );
  });
});
