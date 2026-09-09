/**
 * @jest-environment jsdom
 */

const { checkPhaseModuleGate, renderHeldBackGate } = require('./public/phase_gate_utils.js');

describe('Phase Gate Utils Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('renderHeldBackGate should append overlay to document.body and allow valid bypass code', () => {
    renderHeldBackGate('test-module.html', 'Phase 1: Zine Launch');

    const overlay = document.getElementById('held-back-gate-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain('Phase 1: Zine Launch');

    const input = document.getElementById('gate-bypass-input');
    const btn = document.getElementById('gate-bypass-btn');
    const errorMsg = document.getElementById('gate-error-msg');

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

  it('checkPhaseModuleGate should do nothing if local bypass key exists', async () => {
    localStorage.setItem('mltk_bypass_test-module.html', 'true');
    global.fetch = jest.fn();

    await checkPhaseModuleGate('test-module.html');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.getElementById('held-back-gate-overlay')).toBeNull();
  });
});
