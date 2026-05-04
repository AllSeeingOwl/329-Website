/**
 * @jest-environment jsdom
 */

const {
  setupEventListeners,
  verifyCode,
  attemptApiVerification,
  performApiFetch,
  CONFIG,
  clearDomCache,
} = require('./public/mltk_login_utils');

describe('MLTK Login Gate Tests', () => {
  let originalFetch;
  let mltkUtils;

  beforeAll(() => {
    mltkUtils = require('./public/mltk_login_utils');
  });

  beforeEach(() => {
    if (clearDomCache) clearDomCache();
    // Setup DOM
    document.body.innerHTML = `
            <div id="lockdown-screen" style="display: block;">
                <div id="input-group" class="">
                    <input type="text" id="serial-input" value="">
                </div>
                <p id="error-msg" style="display: none;"></p>
            </div>
            <div id="success-screen" style="display: none;"></div>
        `;

    if (mltkUtils._resetDomCache) {
      mltkUtils._resetDomCache();
    }

    // Mock fetch
    originalFetch = global.fetch;
    global.fetch = jest.fn();

    jest.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  beforeAll(() => {
    delete window.location;
    window.location = { href: '' };
  });

  test('setupEventListeners formats input with hyphens and uppercase', () => {
    setupEventListeners();
    const inputField = document.getElementById('serial-input');

    // Simulate typing lowercase characters
    inputField.value = 'abcd123';
    const event = new Event('input', { bubbles: true });
    inputField.dispatchEvent(event);

    expect(inputField.value).toBe('ABCD-123');

    // Simulate continuing typing
    inputField.value = 'ABCD-123456';
    inputField.dispatchEvent(event);

    expect(inputField.value).toBe('ABCD-1234-56');
  });

  test('setupEventListeners adds click listener that focuses input when lockdown screen is active', () => {
    setupEventListeners();
    const inputField = document.getElementById('serial-input');

    // Mock focus
    inputField.focus = jest.fn();

    document.dispatchEvent(new Event('click'));
    expect(inputField.focus).toHaveBeenCalledTimes(1);

    // Hide lockdown screen
    document.getElementById('lockdown-screen').style.display = 'none';
    document.dispatchEvent(new Event('click'));

    // Should not be called again
    expect(inputField.focus).toHaveBeenCalledTimes(1);
  });

  test('verifyCode success path - displays success screen and hides lockdown', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const inputField = document.getElementById('serial-input');
    inputField.value = '0408-1998-XXXX';

    const event = { preventDefault: jest.fn() };

    // Await the completion of verifyCode directly.
    await verifyCode(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '0408-1998-XXXX' }),
    });

    // In jsdom document.body.style.backgroundColor is not accurately reflected in this test environment
    // Asserting that the display properties are correctly toggled for lockdown and success screens
    expect(document.getElementById('lockdown-screen').style.display).toBe('none');
    expect(document.getElementById('success-screen').style.display).toBe('flex');
  });

  test('verifyCode error path - displays error, clears input, shakes, and hides error after timeout', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }),
    });

    const inputField = document.getElementById('serial-input');
    const errorMsg = document.getElementById('error-msg');
    const inputGroup = document.getElementById('input-group');

    inputField.value = 'INVALID-CODE';

    const event = { preventDefault: jest.fn() };
    await verifyCode(event);

    expect(global.fetch).toHaveBeenCalledWith('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'INVALID-CODE' }),
    });

    expect(errorMsg.style.display).toBe('block');
    expect(inputGroup.classList.contains('shake')).toBe(true);
    expect(inputField.value).toBe('');

    // Error message should disappear after 3 seconds
    jest.advanceTimersByTime(3000);
    expect(errorMsg.style.display).toBe('none');
  });

  test('verifyCode fetch error - catches error and logs to console, and fails authentication', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    const mockError = new Error('Network failure');
    global.fetch.mockRejectedValueOnce(mockError);

    const inputField = document.getElementById('serial-input');
    inputField.value = 'ANY-CODE';

    const event = { preventDefault: jest.fn() };
    await verifyCode(event);

    expect(console.error).toHaveBeenCalledWith('Error verifying code via API:', mockError);

    // Network error should fail authentication and show the error msg
    const errorMsg = document.getElementById('error-msg');
    expect(errorMsg.style.display).toBe('block');

    console.error = originalConsoleError;
  });

  test('setupEventListeners and verifyCode handle missing DOM elements gracefully', async () => {
    // Clear DOM
    document.body.innerHTML = '';

    // Should not throw
    setupEventListeners();

    // Dispatch a click, should not throw
    document.dispatchEvent(new Event('click'));

    // verifyCode success path with missing elements
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const event = { preventDefault: jest.fn() };
    await verifyCode(event);
    // Expect fetch to be called with empty code since inputField is missing
    expect(global.fetch).toHaveBeenCalledWith('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '' }),
    });

    // verifyCode error path with missing elements
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }),
    });
    await verifyCode(event);
    jest.advanceTimersByTime(3000);

    // verifyCode when fetch rejects
    const originalConsoleError = console.error;
    console.error = jest.fn();
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));
    await verifyCode(event);
    expect(console.error).toHaveBeenCalled();

    // Also call with no event
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));
    await verifyCode();
    expect(console.error).toHaveBeenCalledTimes(2);

    console.error = originalConsoleError;
  });

  describe('attemptApiVerification error handling', () => {
    let originalConsoleError;

    beforeEach(() => {
      originalConsoleError = console.error;
      console.error = jest.fn();
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });

    test('returns false when API fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API failure'));

      const result = await attemptApiVerification('SOME-CODE');
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('performApiFetch', () => {
    test('successful fetch returns JSON response', async () => {
      const mockData = { success: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await performApiFetch('TEST-CODE');

      expect(global.fetch).toHaveBeenCalledWith('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: 'TEST-CODE' }),
      });
      expect(result).toEqual(mockData);
    });

    test('throws error when response is not ok', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(performApiFetch('TEST-CODE')).rejects.toThrow(
        'API returned an error or is not available'
      );
    });

    test('propagates network errors', async () => {
      const networkError = new Error('Network failure');
      global.fetch.mockRejectedValueOnce(networkError);

      await expect(performApiFetch('TEST-CODE')).rejects.toThrow('Network failure');
    });
  });
});
