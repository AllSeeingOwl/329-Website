const request = require('supertest');

describe('Server Tests', () => {
  let app;
  let originalExit;
  let originalEnv;
  let originalConsoleError;

  beforeEach(() => {
    // Save original states
    originalExit = process.exit;
    originalEnv = { ...process.env };
    originalConsoleError = console.error;

    // Mock process.exit to prevent test runner from exiting
    process.exit = jest.fn();
    // Mock console.error to keep test output clean
    console.error = jest.fn();

    // Clear require cache to ensure fresh evaluation of server.js for each test
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original states
    process.exit = originalExit;
    // Restore process.env without reassigning the object to maintain object identity
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
    console.error = originalConsoleError;
  });

  it('should return { success: true } when provided with correct AUTH_PASSWORD', async () => {
    // Set up environment with AUTH_PASSWORD
    process.env.AUTH_PASSWORD = 'test_password_123';

    // Require the app after setting environment variables
    app = require('./server');

    const response = await request(app)
      .post('/api/verify')
      .send({ code: 'test_password_123' })
      .expect(200);

    expect(response.body).toEqual({ success: true });
  });

  it('should return { success: false } when provided with incorrect code', async () => {
    // Set up environment with AUTH_PASSWORD
    process.env.AUTH_PASSWORD = 'test_password_123';

    // Require the app after setting environment variables
    app = require('./server');

    const response = await request(app)
      .post('/api/verify')
      .send({ code: 'wrong_password' })
      .expect(200);

    expect(response.body).toEqual({ success: false });
  });

  it('should use the default fallback password if AUTH_PASSWORD is not set', async () => {
    // Remove AUTH_PASSWORD from environment
    delete process.env.AUTH_PASSWORD;

    // Require the app, which should use the fallback password
    app = require('./server');

    const response = await request(app)
      .post('/api/verify')
      .send({ code: '0408-1998-XXXX' })
      .expect(200);

    expect(response.body).toEqual({ success: true });
  });

  it('should serve maintenance page when MAINTENANCE_MODE is true', async () => {
    // Set up environment
    process.env.AUTH_PASSWORD = 'test_password_123';
    process.env.MAINTENANCE_MODE = 'true';

    // Require the app after setting environment variables
    app = require('./server');

    const response = await request(app).get('/').expect(503);

    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('SYSTEM MAINTENANCE');
  });

  it('should return 503 for API routes when MAINTENANCE_MODE is true', async () => {
    // Set up environment
    process.env.AUTH_PASSWORD = 'test_password_123';
    process.env.MAINTENANCE_MODE = 'true';

    // Require the app after setting environment variables
    app = require('./server');

    await request(app).post('/api/verify').send({ code: 'test_password_123' }).expect(503);
  });

  it('should return 503 for non-existent routes when MAINTENANCE_MODE is true', async () => {
    // Set up environment
    process.env.AUTH_PASSWORD = 'test_password_123';
    process.env.MAINTENANCE_MODE = 'true';

    // Require the app after setting environment variables
    app = require('./server');

    await request(app).get('/non-existent-page').expect(503);
  });

  it('should not serve maintenance page when MAINTENANCE_MODE is false', async () => {
    // Set up environment
    process.env.AUTH_PASSWORD = 'test_password_123';
    process.env.MAINTENANCE_MODE = 'false';

    // Require the app after setting environment variables
    app = require('./server');

    const response = await request(app).get('/').expect(200);

    expect(response.text).toContain('<title>3minsto9 Operations - Portal</title>');
  });

  it('should set appropriate security headers on responses', async () => {
    // Set up environment
    process.env.AUTH_PASSWORD = 'test_password_123';

    // Require the app after setting environment variables
    app = require('./server');

    const response = await request(app).get('/').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['permissions-policy']).toBe('geolocation=(), camera=(), microphone=()');
    expect(response.headers['content-security-policy']).toBe(
      "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.tailwindcss.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
    );
  });

  it('should return 413 Payload Too Large when request body exceeds 100kb', async () => {
    // Set up environment
    process.env.AUTH_PASSWORD = 'test_password_123';

    // Require the app after setting environment variables
    app = require('./server');

    // Create a large payload (> 100kb)
    const largeCode = 'a'.repeat(1024 * 101); // 101kb

    await request(app).post('/api/verify').send({ code: largeCode }).expect(413);
  });

  it('should not leak stack traces on unhandled errors', async () => {
    process.env.AUTH_PASSWORD = 'test_password_123';
    app = require('./server');

    // Inject an error-throwing route before the catch-all
    app.use('/force-error', (req, res, next) => {
      next(new Error('Simulated internal error'));
    });

    // Move the injected route to the front of the router stack
    const routerStack = app._router ? app._router.stack : app.router.stack;
    const middleware = routerStack.pop();
    routerStack.splice(2, 0, middleware);

    const response = await request(app).get('/force-error').expect(500);
    expect(response.body).toEqual({ error: 'Internal Server Error' });
    expect(response.text).not.toContain('Error: Simulated internal error');
  });

  it('should return 400 Bad Request when provided with a malformed URI', async () => {
    // Require the app
    app = require('./server');

    // Send a request with a deliberately malformed URI
    const response = await request(app).get('/%c0%af').expect(400);

    expect(response.body).toEqual({ error: 'Bad Request: Malformed URI' });
  });

  it('should return 503 plain text when EMERGENCY_LOCKDOWN is true', async () => {
    // Set up environment
    process.env.AUTH_PASSWORD = 'test_password_123';
    process.env.EMERGENCY_LOCKDOWN = 'true';

    // Require the app after setting environment variables
    app = require('./server');

    const response = await request(app).get('/').expect(503);

    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('503 Service Unavailable: SYSTEM LOCKDOWN IN EFFECT.');
  });

  it('should return 500 when getDashboardConfig fails', async () => {
    // Set up admin password
    process.env.ADMIN_PASSWORD = 'test_admin_password';

    // Mock getDashboardConfig to throw an error
    jest.doMock('./db', () => ({
      ...jest.requireActual('./db'),
      getDashboardConfig: jest.fn().mockRejectedValue(new Error('Database error')),
    }));

    app = require('./server');

    // First, get an admin token
    const authResponse = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'test_admin_password' })
      .expect(200);

    const token = authResponse.body.token;

    // Then, call the dashboard-config endpoint
    const response = await request(app)
      .get('/api/admin/dashboard-config')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);

    expect(response.body).toEqual({ error: 'Failed to fetch dashboard config' });
  });
});
