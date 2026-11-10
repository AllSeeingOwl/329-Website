/**
 * @jest-environment jsdom
 */
const {
  formatSerial,
  verifySerial,
  submitCommsLink,
  initSystemOverride,
  SYSTEM_OVERRIDE_CONFIG,
} = require('./public/system_override_utils.js');

const jsonRes = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const flush = () => new Promise((r) => setTimeout(r, 0));

const buildDom = () => {
  document.body.innerHTML = `
    <form id="keyForm"><input id="serialKey" /><button id="keyBtn">DECRYPT</button></form>
    <div id="emailStep" style="display:none">
      <form id="hackedForm"><input id="commsLink" type="email" /><button id="submitBtn">GO</button></form>
    </div>
    <div id="successMessage" style="display:none"></div>
    <div id="errorMessage" style="display:none"></div>`;
};

describe('system_override_utils', () => {
  it('formats serials as XXXX-XXXX-XXXX', () => {
    expect(formatSerial('04081998xxxx')).toBe('0408-1998-XXXX');
    expect(formatSerial('0408-1998-XXXX-extra')).toBe('0408-1998-XXXX');
    expect(formatSerial('')).toBe('');
  });

  it('maps /api/verify responses', async () => {
    expect(
      await verifySerial('x', jest.fn().mockResolvedValue(jsonRes(200, { success: true })))
    ).toBe('ok');
    expect(
      await verifySerial('x', jest.fn().mockResolvedValue(jsonRes(200, { success: false })))
    ).toBe('denied');
    expect(await verifySerial('x', jest.fn().mockResolvedValue(jsonRes(429, {})))).toBe(
      'rate_limited'
    );
    expect(await verifySerial('x', jest.fn().mockRejectedValue(new Error('x')))).toBe('error');
  });

  it('lets readers through when email collection is switched off (403)', async () => {
    expect(await submitCommsLink('a@b.co', jest.fn().mockResolvedValue(jsonRes(403, {})))).toBe(
      'ok'
    );
    expect(await submitCommsLink('a@b.co', jest.fn().mockResolvedValue(jsonRes(400, {})))).toBe(
      'invalid'
    );
  });

  it('runs serial -> email -> data drop', async () => {
    buildDom();
    const assign = jest.fn();
    const win = { setTimeout: (fn) => fn(), location: { assign } };
    const fetchFn = jest.fn(async (url) => {
      if (url === '/api/access-status') return jsonRes(200, { verified: false });
      if (url === '/api/verify') return jsonRes(200, { success: true });
      if (url === '/api/emails/collect') return jsonRes(200, { success: true });
      throw new Error('unexpected ' + url);
    });

    initSystemOverride(document, win, fetchFn);
    await flush();
    expect(document.getElementById('emailStep').style.display).toBe('none');

    document.getElementById('serialKey').value = '04081998XXXX';
    document.getElementById('keyForm').dispatchEvent(new Event('submit'));
    await flush();
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/verify',
      expect.objectContaining({ method: 'POST' })
    );
    expect(JSON.parse(fetchFn.mock.calls.find((c) => c[0] === '/api/verify')[1].body).code).toBe(
      '0408-1998-XXXX'
    );
    expect(document.getElementById('emailStep').style.display).toBe('block');

    document.getElementById('commsLink').value = 'reader@example.com';
    document.getElementById('hackedForm').dispatchEvent(new Event('submit'));
    await flush();
    expect(document.getElementById('successMessage').style.display).toBe('block');
    expect(assign).toHaveBeenCalledWith(SYSTEM_OVERRIDE_CONFIG.DATA_DROP_URL);
  });

  it('shows an in-universe error for a wrong serial and stays on step 1', async () => {
    buildDom();
    const fetchFn = jest.fn(async (url) =>
      url === '/api/verify' ? jsonRes(200, { success: false }) : jsonRes(200, { verified: false })
    );
    initSystemOverride(
      document,
      { setTimeout: () => {}, location: { assign: jest.fn() } },
      fetchFn
    );
    document.getElementById('serialKey').value = '1111-2222-3333';
    document.getElementById('keyForm').dispatchEvent(new Event('submit'));
    await flush();
    expect(document.getElementById('errorMessage').textContent).toContain('INVALID SERIAL');
    expect(document.getElementById('emailStep').style.display).toBe('none');
  });

  it('skips straight to the email step for readers already verified', async () => {
    buildDom();
    const fetchFn = jest.fn(async () => jsonRes(200, { verified: true }));
    initSystemOverride(
      document,
      { setTimeout: () => {}, location: { assign: jest.fn() } },
      fetchFn
    );
    await flush();
    expect(document.getElementById('emailStep').style.display).toBe('block');
  });
});
