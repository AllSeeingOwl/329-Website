/**
 * @jest-environment jsdom
 */

describe('Theme Toggle Utilities Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    jest.resetModules();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  test('uses system prefers-color-scheme: dark when no theme is saved', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    require('./public/theme_toggle');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    const toggleBtn = document.getElementById('theme-toggle');
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Switch to light mode');
  });

  test('uses saved studio-theme over system preference', () => {
    localStorage.setItem('studio-theme', 'light');

    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      ariaLabel: '',
    }));

    require('./public/theme_toggle');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.documentElement.getAttribute('data-theme')).toBeNull();

    const toggleBtn = document.getElementById('theme-toggle');
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Switch to dark mode');
  });

  test('toggles theme and updates status announcer on click', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
    }));

    require('./public/theme_toggle');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const toggleBtn = document.getElementById('theme-toggle');
    const statusAnnouncer = document.querySelector('[role="status"]');

    expect(toggleBtn).not.toBeNull();
    expect(statusAnnouncer).not.toBeNull();

    // First click: switch to dark mode
    toggleBtn.click();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('studio-theme')).toBe('dark');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(statusAnnouncer.textContent).toBe('Dark mode enabled');

    // Second click: switch back to light mode
    toggleBtn.click();

    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem('studio-theme')).toBe('light');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Switch to dark mode');
    expect(statusAnnouncer.textContent).toBe('Light mode enabled');
  });
});
