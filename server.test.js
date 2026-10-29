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

  it('should return status ok on /health endpoint', async () => {
    app = require('./server');

    const response = await request(app).get('/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
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

  it('should return { success: false } when code length exceeds 100 characters', async () => {
    process.env.AUTH_PASSWORD = 'test_password_123';
    app = require('./server');

    const oversizedCode = 'x'.repeat(101);
    const response = await request(app)
      .post('/api/verify')
      .send({ code: oversizedCode })
      .expect(200);

    expect(response.body).toEqual({ success: false });
  });

  it('should safely handle unparsed or empty body on /api/verify without throwing', async () => {
    process.env.AUTH_PASSWORD = 'test_password_123';
    app = require('./server');

    const response = await request(app)
      .post('/api/verify')
      .set('Content-Type', 'application/json')
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
    expect(response.headers['x-download-options']).toBe('noopen');
    expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    expect(response.headers['permissions-policy']).toBe('geolocation=(), camera=(), microphone=()');
    expect(response.headers['content-security-policy']).toBe(
      "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.tailwindcss.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
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

  it('should include CORS headers allowing cross-origin requests', async () => {
    // Require the app
    app = require('./server');

    const response = await request(app).options('/api/verify').expect(204);

    // Default cors() sets Access-Control-Allow-Origin to *
    expect(response.headers['access-control-allow-origin']).toBe('*');
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

  it('should validate inputs for /api/admin/maintenance-config endpoints', async () => {
    process.env.ADMIN_PASSWORD = 'test_admin_password';
    app = require('./server');

    // Get admin session
    const authResponse = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'test_admin_password' })
      .expect(200);

    const token = authResponse.body.token;

    // Test invalid key
    await request(app)
      .post('/api/admin/maintenance-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'invalid_key', value: true })
      .expect(400);

    // Test non-boolean value
    await request(app)
      .post('/api/admin/maintenance-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'global', value: 'not_a_boolean' })
      .expect(400);

    // Test valid request
    await request(app)
      .post('/api/admin/maintenance-config')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Admin-User', 'sentinel-test-admin')
      .send({ key: 'global', value: true })
      .expect(200);

    // Test /all invalid value
    await request(app)
      .post('/api/admin/maintenance-config/all')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 'invalid' })
      .expect(400);

    // Test /all valid value
    await request(app)
      .post('/api/admin/maintenance-config/all')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Admin-User', 'sentinel-test-admin')
      .send({ value: false })
      .expect(200);

    // Verify audit log entries were created
    const logsRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(logsRes.body.success).toBe(true);
    const actions = logsRes.body.logs.map((l) => l.action);
    expect(actions).toContain('UPDATE_MAINTENANCE_CONFIG');
    expect(actions).toContain('UPDATE_ALL_MAINTENANCE_CONFIG');
  });

  it('should sanitize invalid Host headers in sitemap endpoints to prevent Host Header Injection', async () => {
    app = require('./server');

    // Test malicious Host header with injected script tag
    const xmlResponse = await request(app)
      .get('/sitemap.xml')
      .set('Host', 'evil.com"><script>alert(1)</script>')
      .expect(200);

    expect(xmlResponse.text).not.toContain('evil.com');
    expect(xmlResponse.text).not.toContain('<script>');
    expect(xmlResponse.text).toContain('localhost:3000');

    // Test internal sitemap endpoint
    const jsonResponse = await request(app)
      .get('/internal-sitemap.json')
      .set('Host', 'malicious-domain.com/path')
      .expect(200);

    expect(jsonResponse.body.pages[0]).not.toContain('malicious-domain.com');
    expect(jsonResponse.body.pages[0]).toContain('localhost:3000');
  });

  it('should exclude noindex pages and include indexable pages in sitemap.xml', async () => {
    app = require('./server');

    const response = await request(app)
      .get('/sitemap.xml')
      .set('Host', 'www.yourdomain.com')
      .expect(200);

    expect(response.text).toContain('<loc>http://www.yourdomain.com/</loc>');
    expect(response.text).toContain('<loc>http://www.yourdomain.com/surface-home-page</loc>');
    expect(response.text).toContain('<loc>http://www.yourdomain.com/releases</loc>');

    // Excluded noindex pages
    expect(response.text).not.toContain('404');
    expect(response.text).not.toContain('maintenance');
    expect(response.text).not.toContain('mltk-classified-document');
    expect(response.text).not.toContain('104.9-global-directives');
  });

  it('should prevent Open Redirect vulnerabilities when redirecting .html requests to clean URLs', async () => {
    app = require('./server');

    // Protocol-relative URL attempt with leading double slash
    const response1 = await request(app).get('//evil.com/test.html').expect(301);
    expect(response1.headers['location']).toBe('/evil.com/test');

    // Attempt with leading slash and backslash
    const response2 = await request(app).get('/\\evil.com/phishing.html').expect(301);
    expect(response2.headers['location']).toBe('/evil.com/phishing');

    // Standard valid clean URL redirect
    const response3 = await request(app).get('/surface-home-page.html').expect(301);
    expect(response3.headers['location']).toBe('/surface-home-page');
  });
});
