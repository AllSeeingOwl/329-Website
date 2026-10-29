/**
 * @jest-environment node
 */

// Mock @vercel/analytics since it's an ES module that might not be easily required in this test environment
jest.mock('@vercel/analytics', () => ({
  inject: jest.fn(),
}));

// Mock @vercel/speed-insights as well
jest.mock('@vercel/speed-insights', () => ({
  injectSpeedInsights: jest.fn(),
}));

describe('app.js service worker registration', () => {
  let consoleErrorSpy;
  let registerMock;
  let originalNavigator;
  let originalWindow;

  beforeEach(() => {
    jest.resetModules();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock navigator and window for node environment
    registerMock = jest.fn();
    originalNavigator = global.navigator;
    originalWindow = global.window;

    global.navigator = {
      serviceWorker: {
        register: registerMock,
      },
    };

    // Mock window and addEventListener
    global.window = {
      addEventListener: jest.fn((event, cb) => {
        if (event === 'load') {
          global.window._loadCallback = cb;
        }
      }),
      dispatchEvent: jest.fn((event) => {
        if (event.type === 'load' && global.window._loadCallback) {
          global.window._loadCallback();
        }
      }),
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    global.navigator = originalNavigator;
    global.window = originalWindow;
    jest.restoreAllMocks();
  });

  test('should log error when service worker registration fails', async () => {
    const mockError = new Error('Service Worker Error');
    registerMock.mockRejectedValue(mockError);

    // Import app.js - this will execute the code in the module
    require('./public/app.js');

    // Verify listener was added
    expect(global.window.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));

    // Simulate window load event
    global.window.dispatchEvent({ type: 'load' });

    // Wait for the promise in register().then() to settle
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(registerMock).toHaveBeenCalledWith('/sw.js');
    expect(consoleErrorSpy).toHaveBeenCalledWith('ServiceWorker registration failed: ', mockError);
  });

  test('should not log error when service worker registration succeeds', async () => {
    registerMock.mockResolvedValue({});

    require('./public/app.js');

    // Simulate window load event
    global.window.dispatchEvent({ type: 'load' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(registerMock).toHaveBeenCalledWith('/sw.js');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

describe('Accessibility - Character counter live region tests', () => {
  const fs = require('fs');
  const path = require('path');

  test('public/studio-contact-us.html character counter does not use aria-live="polite"', () => {
    const html = fs.readFileSync(path.join(__dirname, 'public/studio-contact-us.html'), 'utf8');
    expect(html).toContain('id="message-char-count"');
    expect(html).not.toMatch(/id="message-char-count"[^>]*aria-live="polite"/);
    expect(html).toMatch(/id="message-char-count"[^>]*aria-live="off"/);
  });

  test('public/mltk-customer-service.html character counter does not use aria-live="polite"', () => {
    const html = fs.readFileSync(path.join(__dirname, 'public/mltk-customer-service.html'), 'utf8');
    expect(html).toContain('id="char-counter"');
    expect(html).not.toMatch(/id="char-counter"[^>]*aria-live="polite"/);
    expect(html).toMatch(/id="char-counter"[^>]*aria-live="off"/);
  });
});

describe('Accessibility - Success message keyboard focus management', () => {
  const fs = require('fs');
  const path = require('path');

  test('public/studio-contact-us.html manages focus on success message', () => {
    const html = fs.readFileSync(path.join(__dirname, 'public/studio-contact-us.html'), 'utf8');
    expect(html).toContain('successMsg.tabIndex = -1');
    expect(html).toContain('successMsg.focus()');
  });

  test('public/surface-home-page.html manages focus on success message', () => {
    const html = fs.readFileSync(path.join(__dirname, 'public/surface-home-page.html'), 'utf8');
    expect(html).toContain('successMsg.tabIndex = -1');
    expect(html).toContain('successMsg.focus()');
  });

  test('public/studio-faq.html manages focus on success message', () => {
    const html = fs.readFileSync(path.join(__dirname, 'public/studio-faq.html'), 'utf8');
    expect(html).toContain('successMsg.tabIndex = -1');
    expect(html).toContain('successMsg.focus()');
  });
});
