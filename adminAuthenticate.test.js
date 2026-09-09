const request = require('supertest');

const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();

jest.mock('@upstash/redis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => {
      return {
        set: (...args) => mockSet(...args),
        get: (...args) => mockGet(...args),
        del: (...args) => mockDel(...args),
      };
    }),
  };
});

const app = require('./server');
const { resetRateLimitMap } = require('./src/routes/admin');

describe('POST /api/admin/authenticate', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimitMap();
    process.env = { ...originalEnv };
    process.env.KV_REST_API_URL = 'https://test-kv.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-token';
    process.env.ADMIN_PASSWORD = 'super-secret-admin-pass';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('authenticates successfully with correct password and sets httpOnly cookie', async () => {
    mockSet.mockResolvedValue('OK');

    const res = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: 'super-secret-admin-pass' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Authenticated',
    });

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const adminCookie = cookies.find((c) => c.startsWith('admin_session='));
    expect(adminCookie).toBeDefined();
    expect(adminCookie).toContain('HttpOnly');
    expect(adminCookie).toContain('SameSite=Strict');
  });

  it('returns 401 with success: false on invalid password', async () => {
    const res = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: 'Invalid password',
    });
  });

  it('rate limits after 5 failed login attempts from the same IP', async () => {
    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/admin/authenticate')
        .send({ password: 'wrong-password' });
      expect(res.status).toBe(401);
    }

    // 6th attempt should be rate limited (429)
    const resBlocked = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: 'super-secret-admin-pass' });

    expect(resBlocked.status).toBe(429);
    expect(resBlocked.body).toEqual({
      success: false,
      message: 'Too many failed login attempts. Please try again later.',
    });
  });

  it('clears failed attempts counter on successful login', async () => {
    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      await request(app).post('/api/admin/authenticate').send({ password: 'wrong-password' });
    }

    // Successful attempt
    mockSet.mockResolvedValue('OK');
    const resSuccess = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: 'super-secret-admin-pass' });
    expect(resSuccess.status).toBe(200);

    // After success, failed attempts should be reset, allowing a failed attempt again without rate limit
    const resFailAgain = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: 'wrong-password' });
    expect(resFailAgain.status).toBe(401);
  });
});
