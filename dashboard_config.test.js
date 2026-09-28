const request = require('supertest');

describe('Surveillance Dashboard Config API Tests', () => {
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

  it('GET /api/dashboard-config returns all 13 modules', async () => {
    app = require('./server');
    const response = await request(app).get('/api/dashboard-config').expect(200);

    expect(response.body).toHaveProperty('activePhaseId');
    expect(response.body).toHaveProperty('config');
    expect(Array.isArray(response.body.config)).toBe(true);
    expect(response.body.config.length).toBe(13);
  });

  it('POST /api/admin/dashboard-config allows updating module status', async () => {
    app = require('./server');
    const authRes = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'admin_test_password' })
      .expect(200);

    const token = authRes.body.token;

    // Update PORTAL: RADIO to active
    await request(app)
      .post('/api/admin/dashboard-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'PORTAL: RADIO', status: 'active' })
      .expect(200);

    const checkRes = await request(app).get('/api/dashboard-config').expect(200);
    const radioItem = checkRes.body.config.find((item) => item.id === 'PORTAL: RADIO');
    expect(radioItem).toBeDefined();
    expect(radioItem.status).toBe('active');

    // Update PORTAL: RADIO to offline
    await request(app)
      .post('/api/admin/dashboard-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'PORTAL: RADIO', status: 'offline' })
      .expect(200);

    const checkRes2 = await request(app).get('/api/dashboard-config').expect(200);
    const radioItem2 = checkRes2.body.config.find((item) => item.id === 'PORTAL: RADIO');
    expect(radioItem2.status).toBe('offline');
  });

  it('POST /api/admin/dashboard-config/all updates all modules status', async () => {
    app = require('./server');
    const authRes = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'admin_test_password' })
      .expect(200);

    const token = authRes.body.token;

    // Set all to offline
    await request(app)
      .post('/api/admin/dashboard-config/all')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'offline' })
      .expect(200);

    const checkRes = await request(app).get('/api/dashboard-config').expect(200);
    expect(checkRes.body.config.every((item) => item.status === 'offline')).toBe(true);

    // Set all to active
    await request(app)
      .post('/api/admin/dashboard-config/all')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' })
      .expect(200);

    const checkRes2 = await request(app).get('/api/dashboard-config').expect(200);
    expect(checkRes2.body.config.every((item) => item.status === 'active')).toBe(true);
  });

  it('phase change synchronizes module active and locked statuses', async () => {
    app = require('./server');
    const authRes = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'admin_test_password' })
      .expect(200);

    const token = authRes.body.token;

    // Set phase to phase1
    await request(app)
      .post('/api/admin/phases/set')
      .set('Authorization', `Bearer ${token}`)
      .send({ phaseId: 'phase1' })
      .expect(200);

    const p1Res = await request(app).get('/api/dashboard-config').expect(200);
    const radioInP1 = p1Res.body.config.find((i) => i.link === 'ollies-radio-scanner.html');
    expect(radioInP1.status).toBe('locked');

    // Set phase to phase1_5_email1 (which unlocks radio scanner)
    await request(app)
      .post('/api/admin/phases/set')
      .set('Authorization', `Bearer ${token}`)
      .send({ phaseId: 'phase1_5_email1' })
      .expect(200);

    const p15Res = await request(app).get('/api/dashboard-config').expect(200);
    const radioInP15 = p15Res.body.config.find((i) => i.link === 'ollies-radio-scanner.html');
    expect(radioInP15.status).toBe('active');
  });
});
