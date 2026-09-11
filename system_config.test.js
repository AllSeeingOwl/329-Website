const request = require('supertest');

describe('System Configuration & Maintenance Endpoints Tests', () => {
  let app;
  let originalEnv;
  let adminToken;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    jest.resetModules();
    process.env.ADMIN_PASSWORD = 'admin_test_password';

    const { resetInMemConfig } = require('./src/routes/admin');
    if (resetInMemConfig) {
      resetInMemConfig();
    }

    app = require('./server');

    // Authenticate admin to get token
    const authRes = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'admin_test_password' })
      .expect(200);

    adminToken = authRes.body.token;
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  it('GET /api/admin/config requires authentication', async () => {
    await request(app).get('/api/admin/config').expect(401);
  });

  it('GET /api/admin/config returns current system configuration', async () => {
    const res = await request(app)
      .get('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.config).toEqual({
      maintenanceMode: false,
      publicSiteEnabled: true,
      adminPanelEnabled: true,
      allowEmailCollection: true,
      emailNotificationEnabled: true,
      maxConcurrentSessions: 10,
      sessionTimeout: 15,
    });
  });

  it('PUT /api/admin/config validates full config object', async () => {
    // Missing fields
    const resInvalid = await request(app)
      .put('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maintenanceMode: true })
      .expect(400);

    expect(resInvalid.body.success).toBe(false);
    expect(resInvalid.body.message).toContain('Invalid configuration');

    // Invalid maxConcurrentSessions
    const resInvalidNum = await request(app)
      .put('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        maintenanceMode: false,
        publicSiteEnabled: true,
        adminPanelEnabled: true,
        allowEmailCollection: true,
        emailNotificationEnabled: true,
        maxConcurrentSessions: -5,
        sessionTimeout: 15,
      })
      .expect(400);

    expect(resInvalidNum.body.success).toBe(false);
  });

  it('PUT /api/admin/config updates configuration successfully', async () => {
    const newConfig = {
      maintenanceMode: false,
      publicSiteEnabled: true,
      adminPanelEnabled: true,
      allowEmailCollection: false,
      emailNotificationEnabled: false,
      maxConcurrentSessions: 20,
      sessionTimeout: 30,
    };

    const updateRes = await request(app)
      .put('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newConfig)
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.config).toEqual(newConfig);

    // Verify GET /api/admin/config reflects changes
    const getRes = await request(app)
      .get('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(getRes.body.config).toEqual(newConfig);
  });

  it('GET /api/admin/maintenance returns health status', async () => {
    const res = await request(app)
      .get('/api/admin/maintenance')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('maintenanceMode');
    expect(res.body).toHaveProperty('publicSiteEnabled');
    expect(res.body).toHaveProperty('storageBackend');
  });

  it('POST /api/admin/maintenance/toggle toggles maintenance mode', async () => {
    // Enable maintenance mode
    const res1 = await request(app)
      .post('/api/admin/maintenance/toggle')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: true })
      .expect(200);

    expect(res1.body.success).toBe(true);
    expect(res1.body.maintenanceMode).toBe(true);

    // Disable maintenance mode
    const res2 = await request(app)
      .post('/api/admin/maintenance/toggle')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: false })
      .expect(200);

    expect(res2.body.success).toBe(true);
    expect(res2.body.maintenanceMode).toBe(false);
  });

  it('Maintenance mode returns 503 on public site when enabled', async () => {
    // Enable maintenance mode
    await request(app)
      .post('/api/admin/maintenance/toggle')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: true })
      .expect(200);

    // Public request should get 503
    await request(app).get('/surface-home-page.html').expect(503);

    // Admin endpoints should still be accessible
    await request(app)
      .get('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
