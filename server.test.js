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
    process.env = originalEnv;
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

  it('should log a fatal error and exit(1) if AUTH_PASSWORD is not set', () => {
    // Remove AUTH_PASSWORD from environment
    delete process.env.AUTH_PASSWORD;

    // Require the app, which should trigger the error and exit
    require('./server');

    expect(console.error).toHaveBeenCalledWith(
      'FATAL: AUTH_PASSWORD environment variable is not set.'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
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

  it('should not serve maintenance page when MAINTENANCE_MODE is false', async () => {
    // Set up environment
    process.env.AUTH_PASSWORD = 'test_password_123';
    process.env.MAINTENANCE_MODE = 'false';

    // Require the app after setting environment variables
    app = require('./server');

    const response = await request(app).get('/').expect(200);

    expect(response.text).toContain('3minsto9 Operations - Portal');
  });
});
