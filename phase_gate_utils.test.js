/**
 * @jest-environment jsdom
 */

const { checkPhaseModuleGate, renderHeldBackGate } = require('./public/phase_gate_utils.js');

describe('Phase Gate Utils Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    jest.restoreAllMocks();
    window.history.pushState({}, '', 'http://localhost/');
  });

  it('renderHeldBackGate should append overlay with ARIA attributes and focus management', () => {
    renderHeldBackGate('test-module.html', 'Phase 1: Zine Launch');

    const overlay = document.getElementById('held-back-gate-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
    expect(overlay.getAttribute('aria-labelledby')).toBe('gate-title');
    expect(overlay.textContent).toContain('Phase 1: Zine Launch');

    const title = document.getElementById('gate-title');
    expect(title).not.toBeNull();

    const input = document.getElementById('gate-bypass-input');
    expect(input.getAttribute('aria-label')).toBe('Bypass code');
    expect(document.activeElement).toBe(input);

    const btn = document.getElementById('gate-bypass-btn');
    expect(btn.getAttribute('aria-label')).toBe('Submit bypass code');

    const errorMsg = document.getElementById('gate-error-msg');
    expect(errorMsg.getAttribute('role')).toBe('alert');

    // Invalid code attempt
    input.value = 'wrong-code';
    btn.click();
    expect(errorMsg.style.display).toBe('block');
    expect(document.getElementById('held-back-gate-overlay')).not.toBeNull();

    // Valid code attempt
    input.value = '0408-1998-XXXX';
    btn.click();
    expect(localStorage.getItem('mltk_bypass_test-module.html')).toBe('true');
    expect(document.getElementById('held-back-gate-overlay')).toBeNull();
  });

  it('renderHeldBackGate should handle Escape keypress navigation', () => {
    const mockWin = { location: { assign: jest.fn(), href: '' } };

    renderHeldBackGate('test-module.html', 'Phase 1: Zine Launch', mockWin);

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);

    expect(mockWin.location.assign).toHaveBeenCalledWith('mltk-surveillance-dashboard');
  });

  it('checkPhaseModuleGate should do nothing if local bypass key exists', async () => {
    localStorage.setItem('mltk_bypass_test-module.html', 'true');
    global.fetch = jest.fn();

    await checkPhaseModuleGate('test-module.html');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.getElementById('held-back-gate-overlay')).toBeNull();
  });

  it('checkPhaseModuleGate should bypass gate when ?preview=true parameter is present', async () => {
    window.history.pushState({}, '', 'http://localhost/test-module.html?preview=true');
    global.fetch = jest.fn();

    await checkPhaseModuleGate('test-module.html');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.getElementById('held-back-gate-overlay')).toBeNull();
  });

  it('checkPhaseModuleGate should render gate if module is held back and no bypass/preview is present', async () => {
    window.history.pushState({}, '', 'http://localhost/test-module.html');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        activePhaseId: 'phase1',
        phases: [
          {
            id: 'phase1',
            name: 'Phase 1: Initial Release',
            heldBackModules: ['test-module.html'],
          },
        ],
      }),
    });

    await checkPhaseModuleGate('test-module.html');

    expect(global.fetch).toHaveBeenCalledWith('/api/phases');
    const overlay = document.getElementById('held-back-gate-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain('Phase 1: Initial Release');
  });
});
