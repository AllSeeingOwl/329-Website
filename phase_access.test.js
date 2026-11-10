const request = require('supertest');

describe('Phase 1 server-side access control', () => {
  let app;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env.ADMIN_PASSWORD = 'admin_test_password';
    process.env.AUTH_PASSWORD = '0408-1998-XXXX';
    delete process.env.MAILERLITE_API_KEY;
    app = require('./server');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const zineCookie = async () => {
    const res = await request(app).post('/api/verify').send({ code: '0408-1998-XXXX' });
    expect(res.body.success).toBe(true);
    const cookies = res.headers['set-cookie'];
    const cookie = cookies.find((c) => c.startsWith('zine_access='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    return cookie.split(';')[0];
  };

  it('does not leak the zine password through the public phases API', async () => {
    const res = await request(app).get('/api/phases').expect(200);
    expect(JSON.stringify(res.body)).not.toContain('0408-1998-XXXX');
    expect(res.body.phases[0]).not.toHaveProperty('description');
    expect(res.body.phases[0]).toHaveProperty('heldBackModules');
  });

  it('makes the Seedless Grapes ZIP a Phase 1 module and holds the radio MP3 for Phase 1.5', async () => {
    const res = await request(app).get('/api/phases').expect(200);
    const phase1 = res.body.phases.find((p) => p.id === 'phase1');
    const phase15 = res.body.phases.find((p) => p.id === 'phase1_5_email1');
    expect(phase1.activeModules).toContain('SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip');
    expect(phase1.heldBackModules).toContain('104_9_PIRATE_INTERCEPT.mp3');
    expect(phase15.activeModules).toContain('104_9_PIRATE_INTERCEPT.mp3');
  });

  it.each([
    '/ollies-radio-scanner',
    '/nova-classified-archive',
    '/nova-parent-directory',
    '/mltk-five-finger-wheel',
    '/mltk-virtue-village-index',
    '/mltk-customer-service',
  ])(
    'refuses held-back module %s in Phase 1 with the in-universe held-back page',
    async (route) => {
      const res = await request(app).get(route).expect(403);
      expect(res.text).toContain('HELD BACK MODULE');
    }
  );

  it('lets a logged-in admin preview a held-back module', async () => {
    const auth = await request(app)
      .post('/api/admin/verify')
      .send({ password: 'admin_test_password' })
      .expect(200);
    await request(app)
      .get('/ollies-radio-scanner')
      .set('Authorization', `Bearer ${auth.body.token}`)
      .expect(200);
  });

  it('serves released Phase 1 pages normally', async () => {
    for (const route of [
      '/system-override',
      '/secure-data-drop-page',
      '/mltk-classified-document',
      '/104.9-global-directives',
    ]) {
      await request(app).get(route).expect(200);
    }
  });

  it.each(['/UNCUT_PUZZLE.pdf', '/SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip'])(
    'sends readers without the zine serial from %s to /system-override',
    async (file) => {
      const res = await request(app).get(file).expect(302);
      expect(res.headers.location).toBe('/system-override');
    }
  );

  it('serves Phase 1 downloads once the zine serial has been verified', async () => {
    const cookie = await zineCookie();
    await request(app).get('/UNCUT_PUZZLE.pdf').set('Cookie', cookie).expect(200);
    await request(app)
      .get('/SEEDLESS_GRAPES_MOTEL_BLUEPRINTS.zip')
      .set('Cookie', cookie)
      .expect(200);
  });

  it('still holds back the Phase 1.5 radio MP3 for verified readers', async () => {
    const cookie = await zineCookie();
    await request(app).get('/104_9_PIRATE_INTERCEPT.mp3').set('Cookie', cookie).expect(403);
  });

  it('reports access status from the cookie and rejects forged cookies', async () => {
    const before = await request(app).get('/api/access-status').expect(200);
    expect(before.body.verified).toBe(false);

    const forged = await request(app)
      .get('/api/access-status')
      .set('Cookie', 'zine_access=' + 'a'.repeat(64))
      .expect(200);
    expect(forged.body.verified).toBe(false);

    const cookie = await zineCookie();
    const after = await request(app).get('/api/access-status').set('Cookie', cookie).expect(200);
    expect(after.body.verified).toBe(true);
  });

  it('does not set the access cookie for a wrong serial', async () => {
    const res = await request(app).post('/api/verify').send({ code: 'WRONG-CODE' });
    expect(res.body.success).toBe(false);
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

describe('MailerLite forwarding', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('is a no-op when MAILERLITE_API_KEY is not set', async () => {
    delete process.env.MAILERLITE_API_KEY;
    const { forwardToMailerLite } = require('./src/mailerlite');
    const fetchFn = jest.fn();
    await expect(forwardToMailerLite('reader@example.com', fetchFn)).resolves.toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('posts the subscriber with the configured group', async () => {
    process.env.MAILERLITE_API_KEY = 'test-key';
    process.env.MAILERLITE_GROUP_ID = '12345';
    const { forwardToMailerLite } = require('./src/mailerlite');
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    await expect(forwardToMailerLite('reader@example.com', fetchFn)).resolves.toBe(true);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://connect.mailerlite.com/api/subscribers');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body)).toEqual({ email: 'reader@example.com', groups: ['12345'] });
  });

  it('reports failure without throwing when MailerLite errors', async () => {
    process.env.MAILERLITE_API_KEY = 'test-key';
    const { forwardToMailerLite } = require('./src/mailerlite');
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = jest.fn().mockRejectedValue(new Error('network down'));
    await expect(forwardToMailerLite('reader@example.com', fetchFn)).resolves.toBe(false);
    errSpy.mockRestore();
  });
});
