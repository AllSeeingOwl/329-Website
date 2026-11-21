const request = require('supertest');

describe('Admin anti-CSRF token for cookie sessions', () => {
  let app;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env.ADMIN_PASSWORD = 'admin_test_password';
    app = require('./server');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const login = async () => {
    const res = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: 'admin_test_password' })
      .expect(200);
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('admin_session='));
    return { cookie: cookie.split(';')[0], csrfToken: res.body.csrfToken };
  };

  it('returns a CSRF token on login that differs from the session token', async () => {
    const res = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: 'admin_test_password' })
      .expect(200);
    expect(typeof res.body.csrfToken).toBe('string');
    expect(res.body.csrfToken).toHaveLength(64);
    expect(res.body.csrfToken).not.toBe(res.body.token);
  });

  it('rejects a cookie-authenticated change without the CSRF header (as before)', async () => {
    const { cookie } = await login();
    await request(app)
      .post('/api/admin/emails/clear?confirm=true')
      .set('Cookie', cookie)
      .send({ confirm: true })
      .expect(403);
  });

  it('rejects a wrong CSRF token', async () => {
    const { cookie } = await login();
    await request(app)
      .post('/api/admin/emails/clear?confirm=true')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', 'f'.repeat(64))
      .send({ confirm: true })
      .expect(403);
  });

  it('accepts a cookie-authenticated change with the CSRF token from login', async () => {
    const { cookie, csrfToken } = await login();
    await request(app)
      .post('/api/admin/emails/clear?confirm=true')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ confirm: true })
      .expect(200);
  });

  it('serves the same CSRF token again after a page reload', async () => {
    const { cookie, csrfToken } = await login();
    const res = await request(app).get('/api/admin/csrf-token').set('Cookie', cookie).expect(200);
    expect(res.body.csrfToken).toBe(csrfToken);
    await request(app).get('/api/admin/csrf-token').expect(401);
  });
});

describe('POST /api/admin/emails/delete', () => {
  let app;
  let db;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    jest.resetModules();
    process.env.ADMIN_PASSWORD = 'admin_test_password';
    delete process.env.MAILERLITE_API_KEY;
    app = require('./server');
    db = require('./db');
    await db.clearAllEmails();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const auth = async () => {
    const res = await request(app)
      .post('/api/admin/authenticate')
      .send({ password: 'admin_test_password' })
      .expect(200);
    return res.body.token;
  };

  it('requires an admin session', async () => {
    await request(app).post('/api/admin/emails/delete').send({ email: 'a@b.co' }).expect(401);
  });

  it('validates the address', async () => {
    const token = await auth();
    for (const email of ['', 'not-an-email', 'x'.repeat(250) + '@a.co', 42]) {
      await request(app)
        .post('/api/admin/emails/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({ email })
        .expect(400);
    }
  });

  it('removes every record of the address (case-insensitive) and keeps the others', async () => {
    await db.saveEmail('Reader@Example.com', 'zine_qr');
    await db.saveEmail('reader@example.com', 'studio_newsletter');
    await db.saveEmail('other@example.com', 'zine_qr');
    const token = await auth();

    const res = await request(app)
      .post('/api/admin/emails/delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'READER@example.com' })
      .expect(200);

    expect(res.body).toEqual({ success: true, removedCount: 2, mailerlite: 'not_configured' });
    const remaining = (await db.getAllEmails()).map((e) => e.email);
    expect(remaining).toEqual(['other@example.com']);
  });

  it('reports zero when the address is not on the list', async () => {
    const token = await auth();
    const res = await request(app)
      .post('/api/admin/emails/delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'nobody@example.com' })
      .expect(200);
    expect(res.body.removedCount).toBe(0);
  });
});

describe('forgetMailerLiteSubscriber', () => {
  const originalEnv = { ...process.env };
  const json = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('is skipped when MailerLite is not configured', async () => {
    delete process.env.MAILERLITE_API_KEY;
    const { forgetMailerLiteSubscriber } = require('./src/mailerlite');
    const fetchFn = jest.fn();
    await expect(forgetMailerLiteSubscriber('a@b.co', fetchFn)).resolves.toBe('not_configured');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('looks the subscriber up by email, then calls forget with its id', async () => {
    process.env.MAILERLITE_API_KEY = 'test-key';
    const { forgetMailerLiteSubscriber } = require('./src/mailerlite');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(json(200, { data: { id: '31986843064993537' } }))
      .mockResolvedValueOnce(json(200, { message: 'ok' }));

    await expect(forgetMailerLiteSubscriber('a+b@example.com', fetchFn)).resolves.toBe('forgotten');
    expect(fetchFn.mock.calls[0][0]).toBe(
      'https://connect.mailerlite.com/api/subscribers/a%2Bb%40example.com'
    );
    expect(fetchFn.mock.calls[1][0]).toBe(
      'https://connect.mailerlite.com/api/subscribers/31986843064993537/forget'
    );
    expect(fetchFn.mock.calls[1][1].method).toBe('POST');
    expect(fetchFn.mock.calls[1][1].headers.Authorization).toBe('Bearer test-key');
  });

  it('reports not_found when MailerLite has no such subscriber', async () => {
    process.env.MAILERLITE_API_KEY = 'test-key';
    const { forgetMailerLiteSubscriber } = require('./src/mailerlite');
    const fetchFn = jest.fn().mockResolvedValue(json(404, {}));
    await expect(forgetMailerLiteSubscriber('a@b.co', fetchFn)).resolves.toBe('not_found');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('reports error without throwing when MailerLite fails', async () => {
    process.env.MAILERLITE_API_KEY = 'test-key';
    const { forgetMailerLiteSubscriber } = require('./src/mailerlite');
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = jest.fn().mockRejectedValue(new Error('network down'));
    await expect(forgetMailerLiteSubscriber('a@b.co', fetchFn)).resolves.toBe('error');
    errSpy.mockRestore();
  });
});
